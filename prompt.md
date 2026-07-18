# FC Legacy – AI Development Specification & Roadmap

## 1. Project Overview & Primary Goal
Build a desktop-first application called **FC Legacy** that automatically tracks and preserves the history of EA Sports FC 26 Career Mode saves.
The application should function as a **historian** for every Career Mode. EA FC already simulates an evolving football world, but it does not provide a persistent historical database across seasons. FC Legacy should create and maintain this missing historical layer.

The application **must not interact with the game while it is running**. Instead, it should monitor the user's Career Mode save folder and automatically import data whenever a save file is updated.

Every Career Mode becomes an independent football universe with its own history.

## 2. Guiding Principles & Success Criteria
* **Historian, not editor:** The application is a historian, not a save editor. Never modify save files.
* **Append-only History:** Never lose historical data. Everything is append-only.
* **Isolation:** Every Career Mode is isolated.
* **Decoupling:** Parser should be replaceable. UI must remain independent of parser. Backend must remain independent of frontend.
* **Performance:** Optimize for careers spanning 20+ seasons.
* **Success Criteria:** The application should allow a user to play a Career Mode for 15–20 seasons and then explore that save as if it were a real football universe, with persistent history that EA FC itself does not provide.

## 3. High-Level Architecture & Technology Stack
### Architecture
```text
EA FC Save File
       │
       ▼
File Watcher Service
       │
       ▼
  Save Parser
       │
       ▼
Data Extraction Layer
       │
       ▼
 Import Pipeline
       │
       ▼
PostgreSQL Database
       │
       ▼
 FastAPI Backend
       │
       ▼
React / Next.js Dashboard
```
The architecture must be cleanly separated into independent modules.

### Technology Stack
* **Backend:** Python 3.12+, FastAPI, SQLAlchemy, Alembic, PostgreSQL (SQLite fallback for local mode)
* **Nice-to-Have (Backend):** Pydantic (validation), Pytest (testing)
* **Frontend:** Next.js, React, TypeScript, Tailwind CSS, Recharts or Chart.js
* **Desktop:** Tauri (preferred for smaller size and lower RAM usage)
* **Background Service:** Watchdog (filesystem monitoring)
* **Optional:** Docker (for online deployment)

### Existing Projects & References (Study First)
When researching or implementing the parser and architecture, refer to:
1. **GioAc96/fc-cm-web-parser:** Browser-based FC 25 Career Mode parser (TypeScript). Best starting point.
2. **sammygriffiths/fifa-career-save-parser:** Low-level parser for binary save files (Node.js).
3. **xAranaktu GitHub:** Reference for FIFA/FC database reverse engineering and internal EA formats.
4. **SirSpacePirate/fc-tracker:** Similar offline tracker project; reference for architectural design (parse once → convert to internal schema).
5. **CMTracker:** Inspiration for features like scouting and squad analysis, though our focus is long-term history.

## 4. Core Modules & Database Design
### Modules
1. **Save Detection:** Monitor EA FC save directory. Detect new/modified saves, ignore unchanged ones. Queue for import.
2. **Career Identification:** Identify if a save belongs to an existing or brand-new career (using internal IDs or hashing). Never duplicate careers.
3. **Save Parser:** Abstract parser that extracts raw data, normalizes it, and outputs structured objects. Not tightly coupled to the DB.
4. **Import Engine:** Compares current save with DB state. Only inserts new information (incremental imports).

### Database Entities
Career, Season, Club, Player, Competition, CompetitionSeason, Match, Transfer, Award, PlayerSeasonStats, ClubSeasonStats, Manager, TimelineEvent, Record.
Every table should support future expansion.

## 5. Development Roadmap

### Phase 0 - Feasibility & Research (Highest Priority)
**Goal:** Prove that the project is technically possible.
* Identify the FC 26 Career Mode save location.
* Reverse engineer or integrate an existing save parser.
* Determine every field that can be extracted and export to JSON.
* Compare saves across seasons and document unsupported data.
* *Project should NOT continue until this phase succeeds.*

### Phase 1 - Core Backend
**Goal:** Build the foundation.
* Create project structure, DB schema, SQLAlchemy models, migrations, repository layer, FastAPI, config management, logging, and unit tests.

### Phase 2 - Save Import Pipeline
**Goal:** Convert saves into database records.
* Build import engine, normalization layer, duplicate detection, incremental imports, career detection, and transaction management.

### Phase 3 - File Monitoring
**Goal:** Full automation.
* Watch save folder, detect changes, queue imports, prevent duplicate processing, implement background worker.

### Phase 4 - Historical Database
**Goal:** Become the historian.
* Track Seasons, Clubs, Players, Competitions, Transfers, Awards, League tables, Managers, Records. Append-only history.

### Phase 5 - Analytics Engine
**Goal:** Generate analytics.
* Career totals, club/competition records, historical rankings, trophy counts, goal contributions, net spend, win percentages. API for analytics.

### Phase 6 - Timeline Engine
**Goal:** Generate automatic historical events.
* E.g., Club wins league, Player wins Ballon d'Or, Record transfer, Retirement, Promotion, Relegation. Queryable timeline.

### Phase 7 - REST API
**Goal:** Complete backend API.
* Endpoints: `/careers`, `/seasons`, `/players`, `/clubs`, `/competitions`, `/transfers`, `/awards`, `/timeline`, `/analytics`, `/search`.

### Phase 8 - Web Dashboard
**Goal:** Complete frontend.
* Pages: Dashboard, Career Overview, Player Page, Club Page, Competition Page, Timeline, Transfers, Analytics, Records, Settings.

### Phase 9 - Football Wiki
**Goal:** Interactive football encyclopedia.
* Automatically generate Wikipedia-like interconnected pages for Players, Clubs, Competitions, Seasons, Transfer Windows, Managers.

### Phase 10 - Advanced Features & Stretch Goals
* **Advanced Features:** AI Season Reviews, Smart scouting, Transfer recommendations, Career comparisons, Cloud sync, Backups, CSV export, Database Import/Export, Dark mode.
* **Stretch Goals:** Natural language search ("Who has won most Champions Leagues?"), automatic season reports, transfer market analytics, interactive graphs, world football map, player career simulations.

---
Database Design

Core entities:

Career

Season

Club

Player

Competition

CompetitionSeason

Match

Transfer

Award

PlayerSeasonStats

ClubSeasonStats

Manager

TimelineEvent

Record

Every table should support future expansion.

Historical Tracking

Every completed season should permanently store:

League winners

Domestic cup winners

European competition winners

League tables (if available)

Player season statistics

Club season statistics

Awards

Transfers

Manager

Financial information (if available)

Never overwrite history.

History is append-only.

Timeline Engine

Automatically generate historical events.

Examples:

2030

Manchester United win the Premier League.

Barcelona sign Florian Wirtz.

Lamine Yamal wins Ballon d'Or.

Arsenal lift the Champions League.

Timeline events should be queryable.

Club Pages

Each club should display:

History

League finishes

Trophies

Managers

Transfer history

Season statistics

Biggest signings

Biggest sales

Historical squad

Financial trends

Player Pages

Every player should have:

Career statistics

Season-by-season stats

Transfer history

Club history

Awards

Career trophies

Retirement status

Career timeline

Growth charts

Competition Pages

For every competition:

History

Past winners

Runners-up

Golden Boot

Golden Glove

Top assists

Historical tables

Records

Search Engine

Support searching:

Players

Clubs

Managers

Competitions

Awards

Transfers

Timeline events

Fuzzy search preferred.

Analytics

Automatically calculate:

Career goals

Career assists

Career clean sheets

Trophy counts

Win percentages

Transfer spending

Net spend

Club dominance

Player growth

Historical rankings

Most successful clubs

Most decorated players

Dashboard

The dashboard should provide:

Recent timeline events

Latest transfers

Current standings

Historical charts

Season summary

Club overview

Player leaderboards


**Final Goal:** Create a complete historical archive of every Career Mode save, allowing users to explore the evolution of their football universe long after EA FC itself has forgotten it.