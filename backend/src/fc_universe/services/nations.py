"""EA FC nation ids -> (display name, flag code).

Flag codes are ISO 3166-1 alpha-2 (lowercase) as used by flagcdn.com, with the
UK home nations using flagcdn's subdivision codes (gb-eng, gb-sct, gb-wls, gb-nir).
"""

NATIONS: dict[int, tuple[str, str]] = {
    1: ("Albania", "al"), 2: ("Andorra", "ad"), 3: ("Armenia", "am"), 4: ("Austria", "at"),
    5: ("Azerbaijan", "az"), 6: ("Belarus", "by"), 7: ("Belgium", "be"), 8: ("Bosnia Herzegovina", "ba"),
    9: ("Bulgaria", "bg"), 10: ("Croatia", "hr"), 11: ("Cyprus", "cy"), 12: ("Czech Republic", "cz"),
    13: ("Denmark", "dk"), 14: ("England", "gb-eng"), 15: ("Estonia", "ee"), 16: ("Faroe Islands", "fo"),
    17: ("Finland", "fi"), 18: ("France", "fr"), 19: ("North Macedonia", "mk"), 20: ("Georgia", "ge"),
    21: ("Germany", "de"), 22: ("Greece", "gr"), 23: ("Hungary", "hu"), 24: ("Iceland", "is"),
    25: ("Republic of Ireland", "ie"), 26: ("Israel", "il"), 27: ("Italy", "it"), 28: ("Latvia", "lv"),
    29: ("Liechtenstein", "li"), 30: ("Lithuania", "lt"), 31: ("Luxembourg", "lu"), 32: ("Malta", "mt"),
    33: ("Moldova", "md"), 34: ("Netherlands", "nl"), 35: ("Northern Ireland", "gb-nir"), 36: ("Norway", "no"),
    37: ("Poland", "pl"), 38: ("Portugal", "pt"), 39: ("Romania", "ro"), 40: ("Russia", "ru"),
    41: ("San Marino", "sm"), 42: ("Scotland", "gb-sct"), 43: ("Slovakia", "sk"), 44: ("Slovenia", "si"),
    45: ("Spain", "es"), 46: ("Sweden", "se"), 47: ("Switzerland", "ch"), 48: ("Turkey", "tr"),
    49: ("Ukraine", "ua"), 50: ("Wales", "gb-wls"), 51: ("Serbia", "rs"), 52: ("Argentina", "ar"),
    53: ("Bolivia", "bo"), 54: ("Brazil", "br"), 55: ("Chile", "cl"), 56: ("Colombia", "co"),
    57: ("Ecuador", "ec"), 58: ("Paraguay", "py"), 59: ("Peru", "pe"), 60: ("Uruguay", "uy"),
    61: ("Venezuela", "ve"), 70: ("Canada", "ca"), 72: ("Costa Rica", "cr"), 76: ("El Salvador", "sv"),
    78: ("Guatemala", "gt"), 81: ("Honduras", "hn"), 82: ("Jamaica", "jm"), 83: ("Mexico", "mx"),
    87: ("Panama", "pa"), 93: ("Trinidad and Tobago", "tt"), 95: ("United States", "us"),
    97: ("Algeria", "dz"), 98: ("Angola", "ao"), 99: ("Benin", "bj"), 101: ("Burkina Faso", "bf"),
    102: ("Burundi", "bi"), 103: ("Cameroon", "cm"), 104: ("Cape Verde", "cv"), 107: ("Comoros", "km"),
    108: ("Congo", "cg"), 109: ("Ivory Coast", "ci"), 110: ("DR Congo", "cd"), 112: ("Egypt", "eg"),
    113: ("Equatorial Guinea", "gq"), 116: ("Gabon", "ga"), 117: ("Gambia", "gm"), 118: ("Ghana", "gh"),
    119: ("Guinea", "gn"), 120: ("Guinea-Bissau", "gw"), 121: ("Kenya", "ke"), 127: ("Mali", "ml"),
    128: ("Mauritania", "mr"), 130: ("Morocco", "ma"), 131: ("Mozambique", "mz"), 134: ("Nigeria", "ng"),
    137: ("Senegal", "sn"), 139: ("Sierra Leone", "sl"), 141: ("South Africa", "za"), 144: ("Tanzania", "tz"),
    145: ("Togo", "tg"), 146: ("Tunisia", "tn"), 147: ("Uganda", "ug"), 148: ("Zambia", "zm"),
    149: ("Zimbabwe", "zw"), 151: ("Australia", "au"), 157: ("China PR", "cn"), 161: ("India", "in"),
    163: ("Iran", "ir"), 164: ("Iraq", "iq"), 165: ("Japan", "jp"), 185: ("South Korea", "kr"),
    192: ("UAE", "ae"), 200: ("New Zealand", "nz"), 207: ("Kosovo", "xk"), 208: ("Curaçao", "cw"),
    209: ("Gibraltar", "gi"), 210: ("South Sudan", "ss"), 211: ("Montenegro", "me"),
}


def nation_for(nation_id: int | None) -> tuple[str | None, str | None]:
    return NATIONS.get(nation_id, (None, None))
