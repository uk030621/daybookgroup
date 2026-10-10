# Push notifications — setup guide (GroupDaybook)

Push notifications are now built into GroupDaybook. At the same lead time as the email ("Remind me 1 hour before"), a notification pops up on every device where you have switched notifications on.

Nothing about the existing email reminders or the cron-job.org job changes. The same URL now sends the email **and** the push.

---

## 1. Install

From the project folder:

```
npm install
```

This installs the one new package, `web-push`, and updates `package-lock.json`. Commit the updated lock file along with everything else.

## 2. Generate this app's VAPID keys

VAPID stands for Voluntary Application Server Identification. It is a key pair that proves to the browsers' push services that the notifications really come from your server.

```
npx web-push generate-vapid-keys
```

It prints a **Public Key** and a **Private Key**. Generate a **different pair for each app**; a device registered under one pair cannot be reached with another. Do not reuse the Daybook pair here.

## 3. Environment variables

Add these three to `.env.local` (for local testing) **and** to the Vercel project (Settings → Environment Variables), then redeploy:

| Variable | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | The Public Key from step 2 |
| `VAPID_PRIVATE_KEY` | The Private Key from step 2. Mark it **Sensitive** in Vercel |
| `VAPID_SUBJECT` | `mailto:` followed by an address you control, e.g. `mailto:you@lwjformedia.com` |

The public key deliberately has no `NEXT_PUBLIC_` prefix. The app hands it to the browser through `/api/push/public-key`, so it is read when the server runs rather than baked into the build.

A copy of the full variable list is in `.env.example`.

> Until all three variables exist, the app simply skips push and carries on sending emails. It is safe to deploy first and add the keys afterwards.

## 4. Test locally

```
npm run dev
```

1. Sign in, then click the **bell** in the top bar and choose **Turn on notifications**.
2. Allow notifications when the browser asks.
3. Click **Send a test**. A notification should appear within a few seconds.

Local note: this app and its sibling app both run on `localhost:3000`, so they share one browser registration. If you switch between them, click **Turn off** then **Turn on** again in the bell, because each app has its own keys.

## 5. Deploy

```
git add .
git commit -m "Add push notifications"
git push origin groups-feature
```

Vercel deploys automatically from `groups-feature` to `daybookgroup.lwjformedia.com`.

After the build finishes (check the Deployments tab), open the live site, click the bell and press **Send a test** on each device you want to use.

## 6. Use on iPhone and iPad

Safari only allows notifications for a site that has been added to the Home Screen (as a Progressive Web App, or PWA), on iOS or iPadOS 16.4 or later:

1. Open the site in **Safari** (not an email app's built-in browser).
2. Tap **Share**, then **Add to Home Screen**.
3. Open it from the new Home Screen icon, then tap the bell and turn notifications on.

Android and desktop Chrome, Edge and Firefox work straight from the browser.

---

## How it behaves

- **Per reminder:** a **Push notification** switch appears once a reminder has a due date. It is **on by default**.
- **Same timing as email:** the existing "Remind me … before" setting controls both.
- **Once only:** each reminder is pushed once. Editing the title or notes does not re-send it. Changing the due date or lead time does.
- **Notify group members too:** on a reminder shared with a group, a second switch appears. It is **off by default**. When on, every other active member who has notifications switched on also gets the push, labelled "Shared by <name>".
- **Switching push off** for a reminder also switches the group push off. Un-sharing the reminder stops group pushes too.
- **Member mute:** on the Family page, any member can switch on **Mute push notifications from this group**. They stay in the group and still see shared reminders. Their own reminders are unaffected.
- **Email is unchanged:** emails still go to the reminder's owner only.
- **Several devices:** every device you have switched on gets the notification. Signing out removes that device.
- **Stale reminders are skipped:** if a reminder's notification time passed more than 3 hours ago (for example, the scheduler was down), the push is skipped rather than arriving late.
- **Existing reminders:** reminders created before this update count as push-on, but the 3-hour rule means you will not get a flood of old ones.
- **Dead devices tidy themselves:** if a browser tells the server a subscription is gone, it is deleted automatically.

## What changed in the code

| File | Purpose |
|---|---|
| `public/sw.js` | Service worker: shows the notification and opens the app when tapped |
| `src/lib/push.js` | Sends pushes with `web-push`, builds the message (UK date format) |
| `src/lib/pushClient.js` | Browser helpers (subscribe, detect iPhone, sign-out clean-up) |
| `src/models/PushSubscription.js` | One row per device |
| `src/app/api/push/public-key` | Hands the public key to the browser |
| `src/app/api/push/subscribe` | Saves or removes a device |
| `src/app/api/push/test` | The **Send a test** button |
| `src/components/PushToggle.js` | The bell and its menu in the top bar |
| `src/components/SwitchRow.js` | The on/off switch used in forms |
| `src/app/api/cron/send-reminder-emails/route.js` | Now also sends pushes (same URL, same secret) |
| `src/models/Reminder.js` | New fields: `pushEnabled`, `pushSentAt`, `pushNotifyGroup` |
| `src/app/api/reminders/*` | Accept and save the new fields |
| `src/components/ReminderForm.js` | Push switch and the group switch; email wording changed to "Remind me" |
| `src/components/Navbar.js` | Bell added; sign-out forgets the device |
| `next.config.js` | Stops browsers caching `sw.js` |
| `src/models/Membership.js` | New field: `pushMuted` |
| `src/app/api/groups/[id]/mute/route.js` | Saves a member's mute setting |
| `src/app/api/groups/[id]/route.js` | Also returns the caller's mute setting |
| `src/components/FamilyDashboard.js` | The mute switch |

Also: the GroupDaybook reminder form was missing the 16px mobile font fix on five fields (the iPhone zoom-on-focus problem). They now use `text-base sm:text-sm` like the rest.

No database migration is needed. The `pushsubscriptions` collection is created automatically the first time someone turns notifications on.

## cron-job.org

No change. The response now includes a `push` section, which is useful when you click **Test run**:

```
{"checked":0,"sent":0,"failed":0,"push":{"sent":0,"waiting":0,"skippedStale":0,"failed":0},"errors":[]}
```

- `push.sent`: pushes delivered this run
- `push.waiting`: a push was due but no device is registered yet (retried each run for 3 hours)
- `push.skippedStale`: skipped because the time had passed by more than 3 hours
- `push.failed`: the push service rejected it. The `errors` list says why

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Bell says "Notifications aren't set up on the server yet" | `VAPID_PUBLIC_KEY` is missing, or Vercel hasn't been redeployed since adding it |
| **Send a test** says "No device is registered" | Notifications are off on this device. Turn them on again |
| Test works, real reminders don't | The reminder needs a due date, **Push notification** on, and the cron job running. Check **Test run** output |
| `push.failed` with `401` or `403` in `errors` | The public and private keys don't match, or `VAPID_SUBJECT` isn't a `mailto:` or `https:` address |
| Nothing on iPhone | Not opened from the Home Screen icon, or iOS older than 16.4 |
| Bell says blocked | Allow notifications for the site in browser or phone settings, then reload |
