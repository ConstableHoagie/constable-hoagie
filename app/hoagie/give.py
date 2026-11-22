"""The Give counter: organizations ranked by how much good a dollar does, plus humanitarian news.

How the ranking works (shown in the app):
  1. Evidence-backed lifesaving programs, ranked by GiveWell's estimated cost to save one life
     (lower = more good per dollar). GiveWell's figures are averages of its 2022-2024 funding.
  2. GiveWell's Top Charities Fund, which splits money among #1-4 where it's needed most.
  3. Strong charities measured a different way (share of money that reaches people, and
     independent ratings). They do real good, but they aren't comparable dollar-for-dollar
     with #1-4, so they're listed after.

Numbers were checked on the date in CHECKED. Each card links to its source so anyone can re-check.
"""
from . import feeds

CHECKED = "2026-11-21"
GW = "https://www.givewell.org/charities/top-charities"   # GiveWell's Top Charities page (sources for #1-5)

ORGS = [
    {"rank": 1, "name": "Helen Keller Intl", "program": "Vitamin A supplements for children",
     "per_dollar": "About $2 gives a child vitamin A for a year", "cost_per_life": 3500,
     "benefit": "Prevents deaths from vitamin A deficiency in young children",
     "measure": "GiveWell estimate", "source": GW,
     "learn": "https://www.givewell.org/charities/helen-keller-intl", "donate": "https://secure.givewell.org"},
    {"rank": 2, "name": "Malaria Consortium", "program": "Seasonal medicine to prevent malaria",
     "per_dollar": "About $7 protects a child through malaria season", "cost_per_life": 4000,
     "benefit": "Prevents malaria in young children during peak season",
     "measure": "GiveWell estimate", "source": GW,
     "learn": "https://www.givewell.org/charities/malaria-consortium", "donate": "https://secure.givewell.org"},
    {"rank": 3, "name": "New Incentives", "program": "Cash incentives for childhood vaccines",
     "per_dollar": "About $146 gets an infant fully vaccinated", "cost_per_life": 4500,
     "benefit": "More babies get routine vaccines in northern Nigeria",
     "measure": "GiveWell estimate", "source": GW,
     "learn": "https://www.givewell.org/charities/new-incentives", "donate": "https://secure.givewell.org"},
    {"rank": 4, "name": "Against Malaria Foundation", "program": "Insecticide-treated bed nets",
     "per_dollar": "About $6 buys and delivers one net", "cost_per_life": 5500,
     "benefit": "Protects families from malaria-carrying mosquitoes while they sleep",
     "measure": "GiveWell estimate", "source": GW,
     "learn": "https://www.givewell.org/charities/against-malaria-foundation", "donate": "https://secure.givewell.org"},
    {"rank": 5, "name": "GiveWell Top Charities Fund", "program": "Split among #1-4 where it helps most",
     "per_dollar": "GiveWell takes zero fees from this fund", "cost_per_life": None,
     "benefit": "The easy button: experts pick which of the top programs needs money right now",
     "measure": "GiveWell", "source": GW,
     "learn": "https://www.givewell.org/top-charities-fund", "donate": "https://secure.givewell.org"},
    {"rank": 6, "name": "GiveDirectly", "program": "Cash sent straight to families in extreme poverty",
     "per_dollar": "About 83% of total spending reaches recipients as cash (GiveWell)", "cost_per_life": None,
     "benefit": "Families choose what they need most; CharityWatch rates it A",
     "measure": "Share of money delivered", "source": "https://www.givewell.org/charities/give-directly",
     "learn": "https://www.givedirectly.org/financials", "donate": "https://www.givedirectly.org"},
    {"rank": 7, "name": "Direct Relief", "program": "Medicine and supplies for disasters and clinics",
     "per_dollar": "CharityWatch A+: 90% of spending on programs, $5 to raise $100", "cost_per_life": None,
     "benefit": "Fast medical aid after disasters; Charity Navigator 100% (4 stars) for 2026",
     "measure": "Independent ratings", "source": "https://www.charitywatch.org/charities/direct-relief-direct-relief-foundation",
     "learn": "https://www.charitynavigator.org/ein/951831116", "donate": "https://www.directrelief.org"},
]

METHOD = ("Ranked by how much good a dollar does. #1-4 are ranked by GiveWell's estimated cost to save one life "
          "(lower is better; averages of its 2022-2024 funding). #5 splits money among them. #6-7 are excellent "
          "charities measured differently (share of money reaching people, independent ratings), so they're listed after. "
          "Numbers checked %s; every card links to its source." % CHECKED)


def counter(n=6):
    news = []
    try:
        news = [s for s in feeds.news() if "Humanitarian" in s["tags"]][:n]
    except Exception:
        pass
    return {"orgs": ORGS, "method": METHOD, "checked": CHECKED, "news": news,
            "tax_note": "Gifts to US 501(c)(3) charities can be tax-deductible if you itemize. Hoagie never handles the money: buttons open the charity's own site."}


def featured(day_index):
    """One org for the daily email, rotating through the list."""
    return ORGS[day_index % len(ORGS)]
