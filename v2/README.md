# BeRafiq V2 preview

V1 remains at https://sulaimandarwish.github.io/berafiq-site/ .
V2 lives separately at https://sulaimandarwish.github.io/berafiq-site/v2/ .
Every change in this release adds a file under v2/; no V1 files or deployment
workflow are changed. V2 has its own copies of styles, scripts and editable copy.

The optional customer estimate panel is integrated, with estimated price, setup
and production-time fields and explicit budget-estimate wording. The Python
calculation service is not hosted yet. No estimate is fabricated when unavailable.
The RFQ email action remains available and sends real requests when submitted.

Backend implementation, original calculation engine and local preview instructions:
https://github.com/sulaimandarwish/berafiq-site/pull/1

After deploying and reviewing that service, change only apiBase in
v2/estimator-config.js to the service's HTTPS origin. Remove the service-pending
notice in v2/index.html when the integration is live and verified. Profit margin
and overestimation allowance remain in the server profile, not the client form.
Do not merge PR #1 directly merely to enable V2: that earlier proposal changes
the root V1 page. Reuse/deploy its backend separately.

To disable the optional panel, set enabled:false in v2/estimator-config.js.
To remove V2, revert this additive V2 commit or delete only the v2/ directory.
Keep the original root files intact. No backend hosting was purchased or deployed.

Checks: frontend DOM tests cover notices, estimate rendering, stale responses,
unsupported tolerances, service failure and unchanged RFQ destination. Local asset
references and V2 return URLs are checked. Visual browser QA remains outstanding
because Chromium could not be installed in the execution environment.
