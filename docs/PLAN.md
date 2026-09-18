# Principessa Treatment: plan and decisions

The one rule everything follows: **Principessa should not need to explain herself in order to receive care.**

## 1. Project structure

One repository, one Railway service. Express serves the API under `/api` and the built React app for every other path, so there's one domain, no CORS, and a same-site session cookie.

```
package.json          one set of dependencies and scripts for everything
railway.json          build, pre-deploy migration, start, health check
prisma/               schema.prisma and migrations
shared/types.ts       API shapes used by both sides
server/src/
  index.ts            app setup, security headers, static files
  auth.ts             scrypt passwords, cookie sessions
  bootstrap.ts        creates the two users and the starting content on start
  catalog.ts          starting cards, Do/Don't items, mystery missions, time limits
  state.ts            builds the per-role snapshot the app draws from
  discoveries.ts      counts aftercare into patterns
  realtime.ts         Server-Sent Events: "something changed"
  notify.ts           Web Push (does nothing until VAPID keys are set)
  media.ts            storage interface for photos, voice notes and video (not wired yet)
  routes/             auth, care (the core loop), principessa, principe, common
client/src/
  App.tsx, SignIn.tsx, store.tsx, router.tsx, api.ts, copy.ts, styles.css
  her/                Home, Deck, Offers, Me, My cards
  him/                Her (home), Offer, Mystery, More
  ui/                 Card, Monogram, tab bar, sheet, toast
client/public/        manifest, service worker, icons
```

## 2. Data model

| Table | What it holds |
| --- | --- |
| `User` | The two people. `role` is unique, so there can only ever be one of each. |
| `Session` | SHA-256 of each cookie token, with expiry. The raw token never touches the database. |
| `CurrentState` | One row: how she's feeling (and since when), and Distance or Together mode. |
| `CareCard` | The deck. `title` is in her voice ("Reassure me"); `forHim` is how the app phrases it when asking on her behalf ("some reassurance"). Mode is ANY, DISTANCE or TOGETHER. She can add and hide cards. |
| `CareRequest` | Every way she asks: `CARD`, `CANT_ASK`, `HANDLE_ME`, `SOS`, `OFFER`, plus `MYSTERY`, which is created when he finishes a secret mission and is how she finds out about it. Snapshots her feeling and the mode at that moment. |
| `CareResponse` | His answers: "I'm on it", "Give me a little bit", "I can't right now, but I'm here". For HANDLE_ME it can record the card he chose. Has a `mediaId` slot for later. |
| `Aftercare` | One per request: helped a lot / a little / not really, plus an optional note. She answers; both of them can see it. |
| `Discovery` | A pattern found in aftercare, with SUGGESTED / CONFIRMED / DISMISSED. |
| `Preference` | Do/Don't items. On while `activeSince` is less than a day old. |
| `OpenOffer` | What he has to give right now. Lapses after 12 hours. |
| `MysteryMission` | His secret missions. Hidden from her until he marks one done. |
| `PushSubscription` | One per installed phone that turned notifications on. |
| `Media` | Metadata only (kind, mime type, size, storage key). The bytes go to disk or object storage. |

**Why one request table.** SOS events, Permission to Handle Me, "I can't ask for it" and revealed missions are all rows in `CareRequest` with a different `kind`, rather than parallel tables. They share the same lifecycle (open → answered → done or taken back), the same three answers, and the same aftercare, so one table keeps the loop the same everywhere and lets discoveries count across all of them.

## 3. Screens and navigation

Four tabs on each side, label-only, at the bottom within thumb reach.

### Principessa: Home · Deck · Offers · Me

- **Home.** Answers "how am I, what have I asked for, has he answered". A large sentence in her voice ("I miss you.") that she taps to change; tickets for open requests with his latest answer; the "Did it help?" prompt when something's finished, including "That was a secret mission" when he's finished one; a one-line summary of her Do/Don't; three ways to ask (**Pick a card**, **You decide**, **I can't ask for it**); and **I need you** (SOS), pinned above the tab bar. SOS asks once to confirm, with the confirm button in the same spot.
- **Deck.** Swipe through full-height cards for the current mode, then tap **Ask for this**. The toggle at the top switches to **Ask for me**, which is the "I can't ask for it" path. Cards she's confirmed help with her current feeling come first and say so.
- **Offers.** What he's put on offer, with **Take it**.
- **Me.** How to treat me (Do/Don't), What helps (discoveries to confirm or dismiss), My cards, History, notifications, sign out.

### Principe: Her · Offer · Mystery · More

- **Her.** Answers "how is she, what does she need". A large sentence about her ("She's overwhelmed."), then her requests as cards with the three answers, then "How she wants it right now". While an SOS is unanswered the whole screen turns lipstick red and leads with **She needs you.**
- **Offer.** Tap a preset or write one to put it on offer; take it back any time.
- **Mystery.** A face-down card; draw it to reveal a mission for the current mode. Mark as done (which reveals it to her) or draw another.
- **More.** What tends to help her (confirmed discoveries only), History with her "did it help?" answers, notifications, sign out.

## 4. The core loop

Built and tested first, end to end in the UI:

1. She picks a card and taps **Ask for this**. The card flies off and she lands back on Home, which shows it as "Sent to him."
2. It's stored with her current feeling and mode. His phone updates live over SSE, with a push notification if he's turned them on.
3. He sees her card and answers.
4. She sees "He's on it." (live, plus a push).
5. Either of them marks it done ("Mark as done" / "I'm okay now").
6. Home asks her "Did it help?" for three days, or until she answers or taps "Not now". She can also answer later from History.

Everything else is layered on the same loop: SOS, "You decide" (handle me), "I can't ask for it", taking an offer, Do/Don't, Mystery care, discoveries, and Distance/Together mode.

## 5. Design direction

### Where it comes from

A sister app to **Lovissimi**. It uses the same materials: warm cream paper, brown ink that outlines everything like a sticker, solid drop shadows instead of blur, honey for the main action, and each person's cape colour from Lovissimi (her raspberry, his slate blue). What stays specific to this app is the idea of a deck of cards made for one person. Her care comes as cards with a mark in each corner, the second one upside down like a real playing card. His missions are drawn face down, and "I can't ask for it" arrives as a sealed note.

### Tokens

| Name | Hex | Use |
| --- | --- | --- |
| Crema | `#FDF4E3` | Her side's background |
| Cielo | `#E6EFEE` | His side's background, a pale sky |
| Carta | `#FFF8EA` | Cards and surfaces |
| Inchiostro | `#4A3428` | Text, outlines, drop shadows |
| Miele (honey) | `#F2B02E` | Main actions, the active tab |
| Lampone (raspberry) | `#B3577A`, strong `#9C4166` | Her voice on cards; SOS; his whole screen during SOS |
| Ardesia (slate) | `#3F5A7A` | His voice: offers, revealed missions |

- **Type.** Baloo 2 (heavy) for headlines and everything in her voice; Nunito for interface text. Both are Lovissimi's typefaces, self-hosted. Sentence case throughout.
- **Shapes.** Cards: 22px corners, 2px brown outline, 4px solid shadow. Main buttons: honey, outlined, sitting on a 3px shadow that disappears when pressed. Tickets, chips and inputs: flat, with soft outlines. That keeps the cards and main actions on top of the hierarchy.
- **Layout.** A single left-aligned phone column. The top answers "how is she"; actions sit low, in thumb reach.

### The mark

A raspberry heart wearing a honey tiara, outlined in brown: the sister of Lovissimi's crowned heart. It's the corner index on every card (and upside down in the opposite corner), the wax seal on "I can't ask for it", the medallion on the card back, and the app icon.

### Principles

1. **Her words are the interface.** Card titles are first-person and set large. Raspberry is her voice; slate blue is his.
2. **Colour is state on his side.** Pale sky means calm. Raspberry means she's waiting on an SOS, with a slow breathing pulse that's switched off under reduced motion.
3. **Nothing counts him.** Her "did it help?" answers are visible to him one at a time in History. There are no totals, scores, streaks or reminders.

### History

The first version was a separate identity: powder pink, lipstick red and heavy italic Bodoni. On 18 Sep it was moved into the Lovissimi family at your request. The deck, mirrored corner marks, sealed note and SOS screen carried over; the colours, type and mark changed.

## 6. Decisions (confirmed 18 Sep)

1. **Aftercare is visible to both.** She answers "did it help?"; he sees each answer, with her note, in History. Only she confirms or dismisses discoveries, and he sees the confirmed ones.
2. **Mystery missions are revealed once done.** When he marks a mission done, she gets a notification and a "That was a secret mission" card showing what it was, with "Did it help?". Before that, it stays secret.
3. **SOS asks once to confirm.** A sheet asks "Tell him you need him?" with the button in the same spot as the SOS button, so it's two taps without moving her thumb. Pressing again while one is open asks "Tell him again?" and nudges him.
4. **His screen stays red only until he answers an SOS**, with any of the three answers.
5. **Time limits.** Do/Don't items switch off after a day. Offers lapse after 12 hours. The "Did it help?" prompt stays for 3 days.
6. **Discoveries.** Suggested when the same card, asked for while feeling the same way, has been rated at least 3 times and averages halfway between "a little" and "a lot" or better. Card-only patterns need 4 times. Only positive patterns are suggested.
7. **Language.** English.
8. **Notifications.** To him: SOS, a card, "I can't ask for it", "You decide", an offer taken. To her: each of his answers, and a finished mystery mission.

## 7. Not built yet

- **Media.** Selfies, voice notes and video. The `Media` table, a `mediaId` on responses, and a `MediaStore` interface with a disk implementation exist; there's no upload route or UI yet. For Railway, either mount a volume at `MEDIA_DIR` or add an S3-compatible store behind the same interface.
- Editing a card's wording after it's made (hiding and adding work).
- Push notifications are implemented but untested on a real phone. They need VAPID keys and HTTPS, and on iPhone the installed app.
