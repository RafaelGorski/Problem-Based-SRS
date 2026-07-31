# Inherited System Digest — "Northwind CRM" (brownfield)

You have just taken over an internally-built CRM that has been in production for
nine years. Nobody who wrote it still works here and there is no specification.
This digest is what an engineer actually has on day one: the repository, the
schema, the ticket queue, and a few numbers from the business. It deliberately
mixes **technical debt** with **business consequences** so the methodology has to
separate the two.

## Repository

```
northwind-crm/
├── app/
│   ├── contacts.php          4,100 lines, no tests
│   ├── leads.php             2,800 lines, no tests
│   ├── deals.php             3,300 lines, no tests
│   ├── reports.php           1,900 lines — builds CSV by string concatenation
│   └── legacy/jquery-1.7.js
├── cron/
│   ├── nightly_export.sh     dumps the deals table to an FTP share at 02:00
│   └── lead_import.sh        parses an inbox with a regex; fails silently
└── db/schema.sql
```

## Schema notes (db/schema.sql)

- `contacts` has no unique constraint on `email`. Production currently holds
  **41,800 contact rows for roughly 26,000 real people**.
- `interactions` exists but is written by only one code path (`deals.php`), so
  calls and meetings logged by phone or email never land there.
- `leads.source` is a free-text column: 190 distinct values including "web",
  "Web", "web-form", and "".
- There is no `audit` table. `contacts.updated_at` is overwritten in place.

## Open tickets (top of the queue, by age)

| # | Reported by | Text |
|---|---|---|
| 412 | Sales rep | "I pitched the analytics add-on to Acme last week. Turns out they bought it in March — it was on a different Acme record. Customer was insulted; we lost the renewal conversation." |
| 418 | Sales rep | "I have no idea what my colleague promised this customer before they went on leave. I have to email around and hope someone remembers." |
| 431 | Sales manager | "I rebuild the pipeline forecast by hand in a spreadsheet every Monday from the FTP dump. It takes four hours and it is already stale when I send it." |
| 447 | Marketing | "Roughly 1 in 5 leads from the conference form never appears in the CRM at all. We only notice when the follow-up never happens." |
| 452 | Sales rep | "Nobody chased the Contoso trial. It just expired. There is no reminder anywhere." |
| 459 | Compliance | "A customer asked us to show every change made to their record. We could not produce it." |

## Engineering notes left in the code

```php
// TODO(2019): we should really move this to microservices
// FIXME: search does a LIKE '%...%' over 41k rows, takes ~9s on prod
// NOTE: rewrite in React when we get budget
```

## Numbers from the business

- Reps self-report ~6 hours/week reconciling duplicate or conflicting records.
- 22% of qualified leads receive no contact within 14 days.
- Deal-stage data is entered for only 60% of open deals, so any forecast built
  from it is unreliable.
- Two enterprise renewals were lost last year with "they didn't know our history
  with them" cited in the churn review.

## What leadership says

- **VP Sales:** "Just buy Salesforce." (No budget has been approved.)
- **CTO:** "The real problem is that it's a PHP monolith with no tests."
- **CFO:** "Whatever we do, the team cannot stop shipping for a six-month rewrite."
