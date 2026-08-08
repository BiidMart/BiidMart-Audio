# Build Pipeline

Render's *build pipeline* handles the tasks that occur _before_ a new deploy of your service goes live. Depending on your service, these tasks might include:

- Running your [build command](/deploys#build-command) (`yarn`, `pip install`, etc.)
- Running your [pre-deploy command](/deploys#pre-deploy-command) (for database migrations, asset uploads, etc.)
- Building an image from a Dockerfile

All pipeline tasks consume [pipeline minutes](#pipeline-minutes). Each workspace receives an included monthly amount of pipeline minutes, and you can purchase additional minutes as needed.

[*Pro* workspaces](platform-features-by-plan) and higher can enable the [Performance pipeline tier](#pipeline-tiers) to run pipeline tasks on larger compute instances.

> View your current month's pipeline usage from your [Billing page](https://dashboard.render.com/billing#unbilled-charges).

## Pipeline tiers

[*Pro* workspaces](platform-features-by-plan) and higher can choose between two pipeline tiers: *Starter* and *Performance*.

> Hobby workspaces always use the *Starter* tier.

------

###### Tier

**Starter** (default)

###### Specs

2 CPU 8 GB RAM

###### Description

Each workspace receives a number of Starter-tier [pipeline minutes](#pipeline-minutes) per month, according to its [plan](/pricing):

- *Hobby*: 500 minutes
- *Pro*: 1000 minutes
- *Scale*: 5000 minutes

Recommended unless your pipeline tasks require additional memory or CPU.

---

###### Tier

**Performance**

###### Specs

16 CPU 64 GB RAM

###### Description

Requires a [*Pro* plan](platform-features-by-plan) or higher. Runs builds on compute instances with significantly higher memory and CPU. _Does not_ provide an included monthly amount of [pipeline minutes](#pipeline-minutes). Performance pipeline minutes are billed at a higher rate than Starter minutes. Use this tier if your pipeline tasks require memory or CPU beyond what's provided by the Starter tier.

------

Specs and pricing details for each tier are available from your *Workspace Settings* page in the [Render Dashboard](https://dashboard.render.com).

### Setting your pipeline tier

> *Your pipeline tier is a workspace-wide setting.* Every pipeline task across your workspace uses the same tier.

1. In the [Render Dashboard](https://dashboard.render.com), go to your *Workspace Settings* page.
2. In the *Build Pipeline* section, select a pipeline tier.
3. Confirm your selection in the dialog that appears.

## Pipeline minutes

While they're running, your builds and other pipeline tasks consume *pipeline minutes*. You can view your current month's usage from your [Billing page](https://dashboard.render.com/billing#unbilled-charges).

> *Pipeline minutes are specific to their associated tier.* You can't use Starter minutes with the Performance tier or vice versa.

### Included minutes

Each workspace receives included [Starter-tier](#pipeline-tiers) pipeline minutes per month:

| Workspace plan | Included minutes |
| --- | --- |
| *Hobby* | 500 |
| *Pro* | 1000 |
| *Scale* | 5000 |

The Performance tier does _not_ provide an included monthly amount of pipeline minutes.

### Running out of minutes

If you run out of pipeline minutes during a given month, you automatically purchase a supplementary amount of minutes for your current [tier](#pipeline-tiers), *unless*:

- You've reached your monthly [spend limit](#setting-a-spend-limit), or
- You haven't added a payment method.

In the above cases, *Render stops running pipeline tasks* (including service builds!) for the remainder of the current month. You can reenable pipeline tasks by raising your spend limit (and adding a payment method if you haven't).

### Setting a spend limit

You can set a maximum amount to spend on pipeline minutes each month. As long as you're under your limit for a given month, you automatically purchase a supplementary amount of minutes whenever you run out.

1. In the [Render Dashboard](https://dashboard.render.com), go to your *Workspace Settings* page.
2. In the *Build Pipeline* section, click *Set spend limit* (or *Edit* if you're editing an existing limit).
3. Specify a new limit in the dialog that appears.

## Build limits

- Render cancels a build if any of the following occurs:
  - Memory usage exceeds the limit for your [pipeline tier](#pipeline-tiers).
  - Disk space usage exceeds 16 GB.
  - Your build command fails or times out (after 120 minutes).
  - Your pre-deploy command fails or times out (after 30 minutes).
- Each Render service can have only one active build at a time.
  - Whenever a new build is initiated, Render cancels any in-progress build for the same service.
- Builds don't have access to your running service instance's resources (such as memory or disk).
  - This is because pipeline tasks run on completely separate compute.

---

##### Appendix: Glossary definitions

###### build command

The command that Render runs to build your service from source.

Common examples include `npm install` for Node.js and `pip install -r requirements.txt` for Python.

Related article: https://render.com/docs/deploys.md#build-command

###### pre-deploy command

If set for a service, Render runs this command just before each of its deploys.

Ideal for database migrations and other tasks that should always precede service startup.

Related article: https://render.com/docs/deploys.md#pre-deploy-command