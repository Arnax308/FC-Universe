"""Import service to process parsed save data into the database."""

import logging
from sqlalchemy.orm import Session

from fc_universe.models import (
    Career,
    Season,
    Club,
    Player,
    Competition,
    CompetitionSeason,
    PlayerSeasonStats,
    ClubSeasonStats,
    Transfer,
    TimelineEvent,
    Manager,
    Award,
)
from fc_universe.parser.models import ParsedSaveData

logger = logging.getLogger(__name__)


def get_award_name(type_id: int, is_manager: bool = False) -> str:
    if is_manager:
        mapping = {
            0: "Manager of the Month",
            1: "Manager of the Year",
        }
        return mapping.get(type_id, f"Manager Award #{type_id}")
    else:
        mapping = {
            0: "Player of the Month",
            1: "Player of the Year (Ballon d'Or)",
            2: "Golden Boot",
            3: "Golden Glove",
            4: "Best Player in the World",
        }
        return mapping.get(type_id, f"Player Award #{type_id}")


def is_women_club(club) -> bool:
    if not club:
        return False
    c_name = club.name or ""
    c_league = club.league or ""
    return "(W)" in c_name or "Women" in c_name or "Femenina" in c_league or "WSL" in c_league or "NWSL" in c_league or "Femenino" in c_name or "Feminine" in c_name


class ImportService:
    def __init__(self, db: Session):
        self.db = db

    def import_save(self, parsed_data: ParsedSaveData) -> Career:
        """Import a parsed save file into the database.
        
        This handles the core mapping logic from the raw DB tables
        into our normalized SQLAlchemy models.
        """
        # 1. Get or create Career based on save identifier
        career = self.db.query(Career).filter(
            Career.save_identifier == parsed_data.header.save_identifier
        ).first()

        if not career:
            logger.info(f"Creating new career: {parsed_data.header.career_name}")
            career = Career(
                name=parsed_data.header.career_name,
                save_identifier=parsed_data.header.save_identifier,
                manager_name=parsed_data.header.manager_name,
                team_name=parsed_data.header.team_name,
                team_id=parsed_data.header.team_id,
                save_file_path=parsed_data.header.file_path,
            )
            self.db.add(career)
            self.db.commit()
            self.db.refresh(career)
        else:
            logger.info(f"Updating existing career: {career.name}")
            # Update mutable header fields if needed
            career.manager_name = parsed_data.header.manager_name
            career.team_name = parsed_data.header.team_name
            career.team_id = parsed_data.header.team_id
            career.save_file_path = parsed_data.header.file_path
            
            # Clear existing timeline events on re-import to avoid stale/duplicate events
            self.db.query(TimelineEvent).filter(TimelineEvent.career_id == career.id).delete()
            self.db.commit()

        # 1b. Import Competitions/Leagues (onMQ & CUP_COMPETITIONS)
        raw_leagues = parsed_data.raw_tables.get("onMQ", [])
        existing_comps = {
            c.game_id: c for c in self.db.query(Competition).filter(Competition.career_id == career.id).all()
        }
        
        # Built-in cup & tournament competition dictionary
        CUP_COMPETITIONS = {
            135: ("UEFA Champions League", "continental"),
            136: ("UEFA Europa League", "continental"),
            223: ("UEFA Conference League", "continental"),
            1335: ("Copa del Rey", "cup"),
            5335: ("Copa del Rey", "cup"),
            1327: ("Supercopa de España", "cup"),
            1313: ("FA Cup", "cup"),
            5313: ("FA Cup", "cup"),
            1314: ("EFL Cup (Carabao)", "cup"),
            5314: ("EFL Cup (Carabao)", "cup"),
            1319: ("DFB-Pokal", "cup"),
            5319: ("DFB-Pokal", "cup"),
            1331: ("Coppa Italia", "cup"),
            5331: ("Coppa Italia", "cup"),
            1316: ("Coupe de France", "cup"),
            5316: ("Coupe de France", "cup"),
            139: ("FIFA Club World Cup", "continental"),
        }
        
        for c_id, (c_name, c_type) in CUP_COMPETITIONS.items():
            comp = existing_comps.get(c_id)
            if not comp:
                comp = Competition(
                    career_id=career.id,
                    game_id=c_id,
                    name=c_name,
                    type=c_type,
                    country=""
                )
                self.db.add(comp)
                existing_comps[c_id] = comp
            else:
                comp.name = c_name

        for l in raw_leagues:
            l_id = l.get("aQrQ")
            l_name = l.get("HEQX")
            if l_id is None or not l_name:
                continue
            comp = existing_comps.get(l_id)
            if not comp:
                comp = Competition(
                    career_id=career.id,
                    game_id=l_id,
                    name=l_name,
                    type="league",
                    country=str(l.get("WDGJ", ""))
                )
                self.db.add(comp)
                existing_comps[l_id] = comp
            else:
                comp.name = l_name
        self.db.commit()

        # 1c. Resolve Current Season & Years (zgrE)
        raw_history = parsed_data.raw_tables.get("zgrE", [])
        max_vojk = 0
        for h in raw_history:
            vojk = h.get("vojk") or h.get("vojK") or 0
            if vojk > max_vojk:
                max_vojk = vojk
        
        current_season_year = 2025 + max_vojk
        
        # Seed all historical seasons
        for yr in range(2025, current_season_year + 1):
            season = self.db.query(Season).filter(Season.career_id == career.id, Season.year == yr).first()
            if not season:
                season = Season(career_id=career.id, year=yr, is_current=(yr == current_season_year))
                self.db.add(season)
                self.db.flush()
                
                # Season start event
                self.db.add(TimelineEvent(
                    career_id=career.id,
                    season_id=season.id,
                    event_type="season_start",
                    description=f"The {yr} season has officially kicked off in the {career.name} universe!",
                    gender=2
                ))
            else:
                season.is_current = (yr == current_season_year)
        self.db.commit()
        
        # Get active season object
        active_season = self.db.query(Season).filter(Season.career_id == career.id, Season.is_current == True).first()

        # Build team_id -> league_name mapping from qdZF and Competitions
        team_league_map = {}
        raw_standings = parsed_data.raw_tables.get("qdZF", [])
        for s in raw_standings:
            t_id = s.get("mCXg")
            l_id = s.get("aQrQ")
            if t_id is not None and l_id is not None:
                comp = existing_comps.get(l_id)
                if comp:
                    team_league_map[t_id] = comp.name

        # 2. Extract and import Clubs
        raw_clubs = parsed_data.raw_tables.get("lyxL", [])
        existing_clubs = {}
        if raw_clubs:
            logger.info(f"Importing {len(raw_clubs)} clubs...")
            existing_clubs = {
                c.game_id: c
                for c in self.db.query(Club).filter(Club.career_id == career.id, Club.game_id.isnot(None)).all()
            }
            
            for c in raw_clubs:
                game_id = c.get("mCXg")
                name = c.get("AUsv")
                gender = c.get("EveZ", 0)
                
                if not name or game_id is None:
                    continue
                
                # Append suffix to women's teams to avoid confusion and name collisions
                if gender == 1 and not name.endswith(" (W)"):
                    name = f"{name} (W)"
                    
                club = existing_clubs.get(game_id)
                if not club:
                    club = Club(career_id=career.id, game_id=game_id, name=name)
                    existing_clubs[game_id] = club
                    self.db.add(club)
                else:
                    club.name = name
                
                club.league = team_league_map.get(game_id)
                club.overall_rating = c.get("UERs")
                club.defense_rating = c.get("btsS")
                club.midfield_rating = c.get("SqFN")
                club.attack_rating = c.get("UAKP")
                club.club_worth = c.get("QSnJ")
                club.domestic_prestige = c.get("ppLE")
                club.international_prestige = c.get("edvw")
                club.foundation_year = c.get("yDDQ")
                club.rival_team_id = c.get("erSL")
            self.db.commit()

        # Resolve active team and manager dynamically from user's career table (mPrV) and Knen
        user_rows = parsed_data.raw_tables.get("mPrV", [])
        if user_rows:
            user_team_game_id = user_rows[0].get("NTyS")
            if user_team_game_id is not None:
                # Find the club in existing_clubs
                user_club = existing_clubs.get(user_team_game_id)
                if user_club:
                    career.team_id = user_club.game_id
                    career.team_name = user_club.name
                    logger.info(f"Resolved user's active team: {user_club.name} (Game ID: {user_club.game_id})")
                    
                    # Resolve manager name
                    raw_managers = parsed_data.raw_tables.get("Knen", [])
                    for rm in raw_managers:
                        if rm.get("mCXg") == user_team_game_id:
                            first_name = rm.get("HdeP", "").strip()
                            last_name = rm.get("rREd", "").strip()
                            common_name = rm.get("xnfZ", "").strip()
                            mgr_name = common_name if common_name else f"{first_name} {last_name}".strip()
                            if mgr_name:
                                career.manager_name = mgr_name
                                logger.info(f"Resolved user's manager name: {mgr_name}")
                                break
                    self.db.commit()

        # 3. Extract and import Players
        from fc_universe.services.name_resolver import NameResolver
        name_resolver = NameResolver()

        # Load dynamically generated names (youth players) from save file
        dc_names = {}
        raw_dc_names = parsed_data.raw_tables.get("bneD", [])
        for row in raw_dc_names:
            nameid = row.get("FuiB")
            name = row.get("vIys")
            if nameid is not None and name:
                dc_names[nameid] = name

        # Build set of national team IDs from CxJp (leagueteamlinks)
        national_team_ids = set()
        raw_cxjp = parsed_data.raw_tables.get("CxJp", [])
        for r in raw_cxjp:
            l_id = r.get("aQrQ")
            t_id = r.get("mCXg")
            if l_id in (78, 2136) and t_id is not None:
                national_team_ids.add(t_id)

        # Build player_id -> RrqT record mapping (preferring club links over national team links)
        player_link_map = {}
        raw_links = parsed_data.raw_tables.get("RrqT", [])
        for link in raw_links:
            p_id = link.get("ykFq")
            c_id = link.get("mCXg")
            if p_id is not None and c_id is not None:
                is_national = (c_id in national_team_ids)
                if p_id not in player_link_map:
                    player_link_map[p_id] = link
                else:
                    existing_c_id = player_link_map[p_id].get("mCXg")
                    existing_is_national = (existing_c_id in national_team_ids)
                    # Overwrite if current mapped link is a national team but the new link is a club team
                    if existing_is_national and not is_national:
                        player_link_map[p_id] = link

        raw_players = parsed_data.raw_tables.get("CZUM", [])
        if raw_players:
            logger.info(f"Importing {len(raw_players)} players...")
            existing_players = {
                p.game_id: p for p in self.db.query(Player).filter(Player.career_id == career.id).all()
            }
            new_players = []
            pending_transfers = []
            
            # Identify active loans
            loans = {l.get("ykFq") for l in parsed_data.raw_tables.get("ZrAO", []) if l.get("ykFq") is not None}
            # Club ID mapping to check if a club is Free Agents (111592)
            club_id_to_game_id = {c.id: c.game_id for c in existing_clubs.values()}
            
            for p in raw_players:
                game_id = p.get("ykFq")
                if game_id is None:
                    continue

                t_id = p.get("tHlO")
                q_id = p.get("QCfa")
                h_id = p.get("HDYx")

                # If the player already exists in the DB with a resolved name, keep it.
                # Only overwrite if the existing name is a placeholder.
                existing_player = existing_players.get(game_id)
                existing_name = existing_player.known_name if existing_player else None
                is_placeholder = not existing_name or existing_name.startswith("Player #") or existing_name.startswith("Youth Player #")
                
                if existing_name and not is_placeholder:
                    name_str = existing_name
                else:
                    name_str = name_resolver.resolve_name(game_id, t_id, q_id, h_id, dc_names)

                if not name_str:
                    if game_id >= 280000:
                        name_str = f"Youth Player #{game_id}"
                    else:
                        name_str = f"Player #{game_id}"

                # Get club link from RrqT
                link = player_link_map.get(game_id)
                club_db_id = None
                if link:
                    c_id = link.get("mCXg")
                    linked_club = existing_clubs.get(c_id)
                    if linked_club:
                        club_db_id = linked_club.id

                # Detect Transfers
                if existing_player:
                    old_club_id = existing_player.current_club_id
                    if old_club_id is not None and old_club_id != club_db_id:
                        old_game_id = club_id_to_game_id.get(old_club_id)
                        new_game_id = club_id_to_game_id.get(club_db_id)
                        
                        transfer_type = "buy"
                        if new_game_id == 111592:
                            transfer_type = "release"
                        elif old_game_id == 111592:
                            transfer_type = "free"
                        elif game_id in loans:
                            transfer_type = "loan"
                            
                        pending_transfers.append({
                            "player_game_id": game_id,
                            "from_club_id": old_club_id,
                            "to_club_id": club_db_id,
                            "type": transfer_type
                        })

                # Map position code from wZQU column (EA SPORTS FC 26 authentic position enum)
                POSITION_CODE_MAP = {
                    0: "GK",
                    3: "RB",
                    5: "CB",
                    7: "LB",
                    10: "CDM",
                    12: "RM",
                    14: "CM",
                    16: "LM",
                    18: "CAM",
                    23: "RW",
                    25: "ST",
                    27: "LW",
                }
                pos_code = p.get("wZQU")
                primary_pos = POSITION_CODE_MAP.get(pos_code)

                # Secondary positions from NgVS, OblE columns
                sec_pos_parts = []
                for col in ["NgVS", "OblE"]:
                    sec_code = p.get(col)
                    if sec_code is not None and sec_code >= 0:
                        mapped = POSITION_CODE_MAP.get(sec_code)
                        if mapped and mapped != primary_pos:
                            sec_pos_parts.append(mapped)
                secondary_pos = ", ".join(sec_pos_parts) if sec_pos_parts else None

                # Birth year from eyGK (YYYYMMDD format)
                birth_raw = p.get("eyGK")
                birth_year_val = int(str(birth_raw)[:4]) if birth_raw and birth_raw > 19000000 else None

                # Nationality from enmm (EA FC nationality code)
                NATIONALITY_MAP = {
                    1: "Albania", 2: "Andorra", 3: "Armenia", 4: "Austria", 5: "Azerbaijan",
                    6: "Belarus", 7: "Belgium", 8: "Bosnia Herzegovina", 9: "Bulgaria", 10: "Croatia",
                    11: "Cyprus", 12: "Czech Republic", 13: "Denmark", 14: "England", 15: "Estonia",
                    16: "Faroe Islands", 17: "Finland", 18: "France", 19: "North Macedonia", 20: "Georgia",
                    21: "Germany", 22: "Greece", 23: "Hungary", 24: "Iceland", 25: "Republic of Ireland",
                    26: "Israel", 27: "Italy", 28: "Latvia", 29: "Liechtenstein", 30: "Lithuania",
                    31: "Luxembourg", 32: "Malta", 33: "Moldova", 34: "Netherlands", 35: "Northern Ireland",
                    36: "Norway", 37: "Poland", 38: "Portugal", 39: "Romania", 40: "Russia",
                    41: "San Marino", 42: "Scotland", 43: "Slovakia", 44: "Slovenia", 45: "Spain",
                    46: "Sweden", 47: "Switzerland", 48: "Turkey", 49: "Ukraine", 50: "Wales",
                    51: "Serbia", 52: "Argentina", 53: "Bolivia", 54: "Brazil", 55: "Chile",
                    56: "Colombia", 57: "Ecuador", 58: "Paraguay", 59: "Peru", 60: "Uruguay",
                    61: "Venezuela", 70: "Canada", 72: "Costa Rica", 76: "El Salvador",
                    78: "Guatemala", 81: "Honduras", 82: "Jamaica", 83: "Mexico", 87: "Panama",
                    93: "Trinidad and Tobago", 95: "United States",
                    97: "Algeria", 98: "Angola", 99: "Benin", 101: "Burkina Faso",
                    102: "Burundi", 103: "Cameroon", 104: "Cape Verde", 107: "Comoros",
                    108: "Congo", 109: "Ivory Coast", 110: "DR Congo", 112: "Egypt",
                    113: "Equatorial Guinea", 116: "Gabon", 117: "Gambia", 118: "Ghana",
                    119: "Guinea", 120: "Guinea-Bissau", 121: "Kenya", 127: "Mali",
                    128: "Mauritania", 130: "Morocco", 131: "Mozambique", 134: "Nigeria",
                    137: "Senegal", 139: "Sierra Leone", 141: "South Africa", 144: "Tanzania",
                    145: "Togo", 146: "Tunisia", 147: "Uganda", 148: "Zambia", 149: "Zimbabwe",
                    151: "Australia", 157: "China PR", 161: "India", 163: "Iran", 164: "Iraq",
                    165: "Japan", 185: "South Korea", 192: "UAE", 200: "New Zealand",
                    207: "Kosovo", 208: "Curaçao", 209: "Gibraltar", 210: "South Sudan", 211: "Montenegro",
                }
                nationality_name = NATIONALITY_MAP.get(p.get("enmm"))

                player_data = dict(
                    career_id=career.id,
                    game_id=game_id,
                    first_name="",
                    last_name="",
                    known_name=name_str,
                    position=primary_pos,
                    secondary_positions=secondary_pos,
                    birth_year=birth_year_val,
                    nationality=nationality_name,
                    overall=p.get("UERs"),
                    potential=p.get("mpuH"),
                    gender=p.get("EveZ"),
                    current_club_id=club_db_id,
                    sprint_speed=p.get("NrcP"),
                    acceleration=p.get("SPge"),
                    finishing=p.get("xJZL"),
                    shot_power=p.get("ohpV"),
                    short_passing=p.get("vObb"),
                    long_passing=p.get("kerE"),
                    dribbling=p.get("nEbM"),
                    ball_control=p.get("MgwU"),
                    standing_tackle=p.get("CsyD"),
                    sliding_tackle=p.get("PhuM"),
                    strength=p.get("nmgT"),
                    stamina=p.get("XjDq"),
                    agility=p.get("RRQB"),
                    balance=p.get("onkY"),
                    reactions=p.get("YCnI"),
                    composure=p.get("jlQJ"),
                    interceptions=p.get("wWzG"),
                    positioning=p.get("XsFD"),
                    vision=p.get("ZoOK"),
                    crossing=p.get("wGOH"),
                    jumping=p.get("URGo"),
                    heading_accuracy=p.get("aReg"),
                    aggression=p.get("iTce"),
                    long_shots=p.get("CsBG"),
                    penalties=p.get("AGsE"),
                    free_kick_accuracy=p.get("VgKc"),
                    curve=p.get("YFaA"),
                    volleys=p.get("Dydz"),
                    gk_diving=p.get("xrSG"),
                    gk_handling=p.get("GBGj"),
                    gk_kicking=p.get("kqda"),
                    gk_positioning=p.get("yfhq"),
                    gk_reflexes=p.get("eYFI"),
                    defensive_awareness=p.get("SJKz"),
                    weak_foot_ability=p.get("aOBn"),
                    skill_moves=p.get("BAPc"),
                    international_rep=p.get("WVsa"),
                )

                if not existing_player:
                    new_players.append(Player(**player_data))
                else:
                    for k, v in player_data.items():
                        setattr(existing_player, k, v)
                    
            if new_players:
                self.db.add_all(new_players)
            self.db.commit()

            # --- Mini-scrape: resolve names for top 100 unresolved real players ---
            import time
            unresolved = self.db.query(Player).filter(
                Player.career_id == career.id,
                Player.game_id < 280000,
                (Player.known_name.like('Player #%')) | (Player.known_name == '') | (Player.known_name.is_(None))
            ).order_by(Player.overall.desc()).limit(100).all()
            
            if unresolved:
                logger.info(f"Mini-scraping names for {len(unresolved)} top unresolved real players...")
                resolved_count = 0
                for pl in unresolved:
                    fetched = name_resolver.fetch_from_fifacm(pl.game_id)
                    if fetched:
                        # Update ALL copies of this player across all careers
                        self.db.query(Player).filter(
                            Player.game_id == pl.game_id
                        ).update({Player.known_name: fetched})
                        resolved_count += 1
                    time.sleep(0.05)  # Rate limit
                self.db.commit()
                name_resolver.save_cache()
                logger.info(f"Mini-scrape resolved {resolved_count}/{len(unresolved)} player names.")

            # Now save the pending transfers and generate timeline events
            if pending_transfers:
                logger.info(f"Processing {len(pending_transfers)} player transfers...")
                db_players = {
                    p.game_id: p for p in self.db.query(Player).filter(Player.career_id == career.id).all()
                }
                new_transfers = []
                for pt in pending_transfers:
                    player_obj = db_players.get(pt["player_game_id"])
                    if not player_obj:
                        continue
                    
                    t = Transfer(
                        career_id=career.id,
                        season_id=active_season.id if active_season else None,
                        player_id=player_obj.id,
                        from_club_id=pt["from_club_id"],
                        to_club_id=pt["to_club_id"],
                        type=pt["type"],
                        fee=0.0
                    )
                    new_transfers.append(t)
                
                if new_transfers:
                    self.db.add_all(new_transfers)
                    self.db.commit()
                    
                    # Generate timeline events
                    db_clubs = {c.id: c for c in self.db.query(Club).filter(Club.career_id == career.id).all()}
                    player_id_map = {p.id: p for p in db_players.values()}
                    new_events = []
                    
                    for t_rec in new_transfers:
                        p_obj = player_id_map.get(t_rec.player_id)
                        player_name = p_obj.known_name if p_obj and p_obj.known_name else (f"{p_obj.first_name} {p_obj.last_name}".strip() if p_obj else "Unknown Player")
                        from_club_name = db_clubs.get(t_rec.from_club_id).name if t_rec.from_club_id in db_clubs else "Unknown Club"
                        to_club_name = db_clubs.get(t_rec.to_club_id).name if t_rec.to_club_id in db_clubs else "Unknown Club"
                        
                        if t_rec.type == "buy":
                            desc = f"{player_name} has completed a transfer from {from_club_name} to {to_club_name}."
                        elif t_rec.type == "loan":
                            desc = f"{player_name} has joined {to_club_name} on loan from {from_club_name}."
                        elif t_rec.type == "free":
                            desc = f"{player_name} has signed with {to_club_name} as a free agent."
                        elif t_rec.type == "release":
                            desc = f"{player_name} has been released by {from_club_name}."
                        else:
                            desc = f"{player_name} moved from {from_club_name} to {to_club_name}."
                            
                        event = TimelineEvent(
                            career_id=career.id,
                            season_id=active_season.id if active_season else None,
                            event_type="transfer",
                            description=desc,
                            related_player_id=t_rec.player_id,
                            related_club_id=t_rec.to_club_id or t_rec.from_club_id,
                            gender=p_obj.gender if p_obj else 0
                        )
                        new_events.append(event)
                        
                    if new_events:
                        self.db.add_all(new_events)
                        self.db.commit()
        # 4. Import Club Season Statistics (qdZF)
        if active_season and raw_standings:
            logger.info("Importing club season statistics...")
            existing_club_stats = {
                cs.club_id: cs
                for cs in self.db.query(ClubSeasonStats).filter(ClubSeasonStats.season_id == active_season.id).all()
            }
            
            for s in raw_standings:
                t_id = s.get("mCXg")
                l_id = s.get("aQrQ")
                if t_id is None or l_id is None:
                    continue
                
                club = existing_clubs.get(t_id)
                comp = existing_comps.get(l_id)
                if not club:
                    continue
                
                stats = existing_club_stats.get(club.id)
                if not stats:
                    stats = ClubSeasonStats(
                        club_id=club.id,
                        season_id=active_season.id,
                        competition_id=comp.id if comp else None
                    )
                    self.db.add(stats)
                    existing_club_stats[club.id] = stats
                
                stats.position = s.get("fNOl")
                stats.wins = (s.get("oxHc", 0) or 0) + (s.get("txAm", 0) or 0)
                stats.draws = (s.get("HjBw", 0) or 0) + (s.get("vmpt", 0) or 0)
                stats.losses = (s.get("oQGq", 0) or 0) + (s.get("QMes", 0) or 0)
                stats.goals_for = s.get("BgxX", 0) or 0
                stats.goals_against = s.get("HtAc", 0) or 0
                stats.points = s.get("Yyym", 0) or 0

        # 5. Import Player Season Statistics (RrqT)
        if active_season and raw_links:
            logger.info("Importing player season statistics...")
            db_players = {
                p.game_id: p for p in self.db.query(Player).filter(Player.career_id == career.id).all()
            }
            
            existing_player_stats = {
                ps.player_id: ps
                for ps in self.db.query(PlayerSeasonStats).filter(PlayerSeasonStats.season_id == active_season.id).all()
            }
            
            for link in raw_links:
                p_id = link.get("ykFq")
                t_id = link.get("mCXg")
                if p_id is None:
                    continue
                
                player = db_players.get(p_id)
                club = existing_clubs.get(t_id)
                if not player:
                    continue
                
                stats = existing_player_stats.get(player.id)
                if not stats:
                    stats = PlayerSeasonStats(
                        player_id=player.id,
                        season_id=active_season.id
                    )
                    self.db.add(stats)
                    existing_player_stats[player.id] = stats
                
                stats.club_id = club.id if club else None
                stats.appearances = link.get("stFk", 0) or 0
                stats.goals = link.get("UMDX", 0) or 0
                stats.assists = link.get("NbFh", 0) or link.get("Vili", 0) or 0
                stats.yellow_cards = link.get("jtWI", 0) or 0
                stats.red_cards = link.get("jIcz", 0) or 0
                stats.clean_sheets = link.get("vjla", 0) or 0
                stats.avg_rating = (link.get("pchV", 0) or 0) / 10.0
            
            self.db.commit()

        # 5b. Detect Player Retirements
        if raw_players:
            save_game_ids = {p.get("ykFq") for p in raw_players if p.get("ykFq") is not None}
            db_active_players = self.db.query(Player).filter(Player.career_id == career.id, Player.is_retired == False).all()
            for db_p in db_active_players:
                if db_p.game_id not in save_game_ids:
                    db_p.is_retired = True
                    p_name = db_p.known_name or f"{db_p.first_name} {db_p.last_name}".strip() or "Unknown Player"
                    
                    self.db.add(TimelineEvent(
                        career_id=career.id,
                        season_id=active_season.id if active_season else None,
                        event_type="retirement",
                        description=f"{p_name} has retired from professional football.",
                        related_player_id=db_p.id
                    ))
            self.db.commit()

        # 6. Import Managers (Knen)
        raw_managers = parsed_data.raw_tables.get("Knen", [])
        if raw_managers:
            logger.info(f"Importing {len(raw_managers)} managers...")
            existing_managers = {
                m.game_id: m for m in self.db.query(Manager).filter(Manager.career_id == career.id).all()
            }
            
            for rm in raw_managers:
                game_id = rm.get("VHIB")
                if game_id is None:
                    continue
                    
                first_name = rm.get("HdeP", "").strip()
                last_name = rm.get("rREd", "").strip()
                common_name = rm.get("xnfZ", "").strip()
                name_str = common_name if common_name else f"{first_name} {last_name}".strip()
                if not name_str:
                    name_str = f"Manager #{game_id}"
                    
                team_game_id = rm.get("mCXg")
                club_db_id = None
                linked_club = None
                if team_game_id is not None:
                    linked_club = existing_clubs.get(team_game_id)
                    if linked_club:
                        club_db_id = linked_club.id
                        
                mgr = existing_managers.get(game_id)
                if not mgr:
                    mgr = Manager(
                        career_id=career.id,
                        game_id=game_id,
                        name=name_str,
                        club_id=club_db_id,
                        start_season_id=active_season.id if active_season else None
                    )
                    self.db.add(mgr)
                    existing_managers[game_id] = mgr
                    
                    if club_db_id:
                        event_desc = f"{name_str} has been appointed manager of {linked_club.name}."
                        self.db.add(TimelineEvent(
                            career_id=career.id,
                            season_id=active_season.id if active_season else None,
                            event_type="manager_appointment",
                            description=event_desc,
                            related_club_id=club_db_id,
                            gender=1 if is_women_club(linked_club) else 0
                        ))
                else:
                    if mgr.club_id != club_db_id:
                        old_club_id = mgr.club_id
                        mgr.club_id = club_db_id
                        
                        old_club = self.db.query(Club).filter(Club.id == old_club_id).first() if old_club_id else None
                        new_club = self.db.query(Club).filter(Club.id == club_db_id).first() if club_db_id else None
                        
                        if old_club and new_club:
                            event_desc = f"{name_str} has left {old_club.name} to become the manager of {new_club.name}."
                        elif new_club:
                            event_desc = f"{name_str} has been appointed manager of {new_club.name}."
                        elif old_club:
                            event_desc = f"{name_str} has left his post as manager of {old_club.name}."
                        else:
                            event_desc = f"{name_str} has changed club affiliations."
                            
                        self.db.add(TimelineEvent(
                            career_id=career.id,
                            season_id=active_season.id if active_season else None,
                            event_type="manager_move",
                            description=event_desc,
                            related_club_id=club_db_id or old_club_id,
                            gender=1 if (is_women_club(new_club) or is_women_club(old_club)) else 0
                        ))
                        
            self.db.commit()

        # 7. Import Player Awards (cPet)
        raw_player_awards = parsed_data.raw_tables.get("cPet", [])
        if raw_player_awards:
            logger.info(f"Importing {len(raw_player_awards)} player awards...")
            existing_awards = {
                (a.season_id, a.player_id, a.name): a 
                for a in self.db.query(Award).filter(Award.career_id == career.id, Award.type == "player").all()
            }
            db_players = {
                p.game_id: p for p in self.db.query(Player).filter(Player.career_id == career.id).all()
            }
            
            for ra in raw_player_awards:
                player_game_id = ra.get("ykFq")
                type_id = ra.get("Bwgx")
                season_num = ra.get("vojK")
                
                if player_game_id is None or type_id is None:
                    continue
                    
                player_obj = db_players.get(player_game_id)
                if not player_obj:
                    continue
                    
                award_year = 2025 + (season_num or 0)
                award_season = self.db.query(Season).filter(Season.career_id == career.id, Season.year == award_year).first()
                if not award_season:
                    continue
                    
                award_name = get_award_name(type_id, is_manager=False)
                key = (award_season.id, player_obj.id, award_name)
                
                if key not in existing_awards:
                    award_obj = Award(
                        career_id=career.id,
                        season_id=award_season.id,
                        player_id=player_obj.id,
                        name=award_name,
                        type="player"
                    )
                    self.db.add(award_obj)
                    existing_awards[key] = award_obj
                    
                    player_name = player_obj.known_name or f"{player_obj.first_name} {player_obj.last_name}".strip()
                    event_desc = f"{player_name} has won the {award_name} award!"
                    self.db.add(TimelineEvent(
                        career_id=career.id,
                        season_id=award_season.id,
                        event_type="award",
                        description=event_desc,
                        related_player_id=player_obj.id,
                        gender=player_obj.gender
                    ))
            self.db.commit()
 
        # 8. Import Manager Awards (ShPa)
        raw_mgr_awards = parsed_data.raw_tables.get("ShPa", [])
        if raw_mgr_awards:
            logger.info(f"Importing {len(raw_mgr_awards)} manager awards...")
            existing_awards = {
                (a.season_id, a.name): a 
                for a in self.db.query(Award).filter(Award.career_id == career.id, Award.type == "manager").all()
            }
            
            for ra in raw_mgr_awards:
                team_game_id = ra.get("mCXg")
                type_id = ra.get("Bwgx")
                season_num = ra.get("vojK")
                
                if type_id is None:
                    continue
                    
                award_year = 2025 + (season_num or 0)
                award_season = self.db.query(Season).filter(Season.career_id == career.id, Season.year == award_year).first()
                if not award_season:
                    continue
                    
                award_name = get_award_name(type_id, is_manager=True)
                key = (award_season.id, award_name)
                
                if key not in existing_awards:
                    club_obj = existing_clubs.get(team_game_id)
                    club_name = club_obj.name if club_obj else "their club"
                    
                    award_obj = Award(
                        career_id=career.id,
                        season_id=award_season.id,
                        name=award_name,
                        type="manager"
                    )
                    self.db.add(award_obj)
                    existing_awards[key] = award_obj
                    
                    event_desc = f"Manager of {club_name} has won the {award_name} award!"
                    self.db.add(TimelineEvent(
                        career_id=career.id,
                        season_id=award_season.id,
                        event_type="award",
                        description=event_desc,
                        related_club_id=club_obj.id if club_obj else None,
                        gender=1 if is_women_club(club_obj) else 0
                    ))
            self.db.commit()

        # 9. Generate Competition Trophy Winner Events (from standings qdZF AND competition progress NgwF)
        # Filter: Keep events for user's managed clubs OR Top 5 European leagues (PL, La Liga, Bundesliga, Serie A, Ligue 1) OR major cups OR any league managed by user.
        raw_zgre_teams = parsed_data.raw_tables.get("zgrE", [])
        managed_team_game_ids = {r.get("mCXg") for r in raw_zgre_teams if r.get("mCXg") is not None}
        if career.team_id:
            managed_team_game_ids.add(career.team_id)

        managed_league_names = {
            c.league.lower() for c in existing_clubs.values() 
            if c.game_id in managed_team_game_ids and c.league
        }

        TOP_5_LEAGUES = {13, 53, 19, 31, 16}
        MAJOR_CUPS = {135, 136, 223, 139, 1335, 5335, 1327, 1313, 5313, 1314, 5314, 1319, 5319, 1331, 5331, 1316, 5316}

        def is_relevant_competition(c_id: int, c_name: str) -> bool:
            if c_id in TOP_5_LEAGUES or c_id in MAJOR_CUPS:
                return True
            if c_name and c_name.lower() in managed_league_names:
                return True
            return False

        raw_progress = parsed_data.raw_tables.get("NgwF", [])
        if raw_progress:
            for p in raw_progress:
                won = p.get("SDel")
                if won == 1:
                    t_id = p.get("mCXg")
                    c_id = p.get("OvfW")
                    s_num = p.get("vojK") or p.get("vojk")
                    
                    club = existing_clubs.get(t_id)
                    comp = existing_comps.get(c_id)
                    
                    if club and comp:
                        is_user_club = (t_id in managed_team_game_ids)
                        is_relevant = is_relevant_competition(c_id, comp.name)
                        
                        # Only keep if user's club or Top 5 / Major Cup / Managed League
                        if not is_user_club and not is_relevant:
                            continue
                            
                        # Resolve season object
                        season_year = 2025 + (s_num - 1) if s_num else (active_season.year if active_season else 2025)
                        season_obj = self.db.query(Season).filter(
                            Season.career_id == career.id,
                            Season.year == season_year
                        ).first() or active_season
                        
                        if season_obj:
                            event_desc = f"{club.name} have won the {comp.name} title in the {season_obj.year} season!"
                            
                            existing_event = self.db.query(TimelineEvent).filter(
                                TimelineEvent.career_id == career.id,
                                TimelineEvent.season_id == season_obj.id,
                                TimelineEvent.event_type == "trophy",
                                TimelineEvent.related_competition_id == comp.id,
                                TimelineEvent.related_club_id == club.id
                            ).first()
                            
                            if not existing_event:
                                self.db.add(TimelineEvent(
                                    career_id=career.id,
                                    season_id=season_obj.id,
                                    event_type="trophy",
                                    description=event_desc,
                                    related_club_id=club.id,
                                    related_competition_id=comp.id,
                                    gender=1 if is_women_club(club) else 0
                                ))
            self.db.commit()

        if active_season and raw_standings:
            for s in raw_standings:
                t_id = s.get("mCXg")
                l_id = s.get("aQrQ")
                position = s.get("fNOl")
                
                if position == 1:
                    club = existing_clubs.get(t_id)
                    comp = existing_comps.get(l_id)
                    
                    if club and comp:
                        is_user_club = (t_id in managed_team_game_ids)
                        is_relevant = is_relevant_competition(l_id, comp.name)
                        
                        if not is_user_club and not is_relevant:
                            continue
                            
                        event_desc = f"{club.name} have won the {comp.name} title in the {active_season.year} season!"
                        
                        existing_event = self.db.query(TimelineEvent).filter(
                            TimelineEvent.career_id == career.id,
                            TimelineEvent.season_id == active_season.id,
                            TimelineEvent.event_type == "trophy",
                            TimelineEvent.related_competition_id == comp.id,
                            TimelineEvent.related_club_id == club.id
                        ).first()
                        
                        if not existing_event:
                            self.db.add(TimelineEvent(
                                career_id=career.id,
                                season_id=active_season.id,
                                event_type="trophy",
                                description=event_desc,
                                related_club_id=club.id,
                                related_competition_id=comp.id,
                                gender=1 if is_women_club(club) else 0
                            ))
            self.db.commit()

        # 10. Import Manager Career History (zgrE table - career_managerhistory)
        # zgrE is the true manager history table in EA FC save files.
        from fc_universe.models import ManagerSeasonHistory
        raw_zgre = parsed_data.raw_tables.get("zgrE", [])
        if raw_zgre:
            logger.info(f"Importing {len(raw_zgre)} manager career history records from zgrE...")
            
            # Clear existing history for this career to avoid duplicates on re-import
            self.db.query(ManagerSeasonHistory).filter(
                ManagerSeasonHistory.career_id == career.id
            ).delete()
            self.db.flush()
            
            for idx, row in enumerate(raw_zgre):
                club_game_id = row.get("mCXg")
                if club_game_id is None:
                    continue
                
                club_obj = existing_clubs.get(club_game_id)
                club_db_id = club_obj.id if club_obj else None
                
                s_num = row.get("vojK") or row.get("vojk") or (idx + 1)
                season_year = 2025 + (s_num - 1)
                season_obj = self.db.query(Season).filter(
                    Season.career_id == career.id,
                    Season.year == season_year
                ).first()
                
                matches = row.get("NJUU") or 0
                wins = row.get("zjtP") or 0
                draws = row.get("EBvI") or 0
                losses = row.get("cxMK") or 0
                goals_for = row.get("EwYk") or 0
                goals_against = row.get("IoBz") or 0
                points = row.get("Yyym") or 0
                table_pos = row.get("zhaq") or 0
                league_tr = row.get("npBO") or 0
                cup_tr = row.get("uQOP") or 0
                euro_tr = row.get("jpwC") or 0
                
                history_row = ManagerSeasonHistory(
                    career_id=career.id,
                    season_id=season_obj.id if season_obj else None,
                    club_id=club_db_id,
                    club_game_id=club_game_id,
                    season_number=s_num,
                    matches=matches,
                    wins=wins,
                    draws=draws,
                    losses=losses,
                    goals_for=goals_for,
                    goals_against=goals_against,
                    points=points,
                    table_position=table_pos,
                    league_trophies=league_tr,
                    cup_trophies=cup_tr,
                    euro_trophies=euro_tr,
                )
                self.db.add(history_row)
            
            self.db.commit()

        logger.info(f"Import complete for career {career.id}")
        return career
