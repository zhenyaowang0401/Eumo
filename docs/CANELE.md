# Canele connection

The Focus header has one **Connect your canele** icon immediately before the floating-mole button. It opens the existing bilingual dialog and follows Eumo's day/night theme.

## Connection flow

1. Connect canele to the internet, then open **Setup → Pair screen → New code**.
2. Enter all four digits in the web dialog, including any leading zero. Confirm the import checkbox and choose **Connect**.
3. Confirm the matching `Computer 1234` name on canele. Entering a code alone does not authorize access.
4. After a validated device snapshot arrives, the icon changes to the fluted back view. Pending, disconnected and offline states use the front/screen view.
5. The device controls its own timer. The browser imports time, depth and settled rewards; **Disconnect canele** restores the browser timer and keeps imported progress.

Both sides need internet access; they do not need the same Wi-Fi. Closing the dialog does not cancel an outstanding request. **Cancel pairing** revokes it. Pairing expires after five minutes. On a network failure the last imported progress remains saved and the UI reports offline rather than claiming a live connection.

## Save behavior

- Progress and its replay receipt commit together in one local save write.
- Stable original session IDs and matching settlement fields identify records already in the browser, including a web → device → web backup round trip. Spent stars are not granted again.
- Firmware preserves cumulative v3 counters and includes the full original history. Conflicting or incomplete legacy history pauses sync for review, without clearing the device save.
- v2 snapshots retain previously stored v3 reward receipts. A firmware downgrade must not reset the reward ledger.
- A running timer, home edit or paired-device sync has one tab owner. Other tabs can browse, with progress edits disabled while that owner is active. Ownership recovers automatically when the owner releases or closes.
- A paused or running browser session must be ended and saved before pairing. Clear site data only after exporting a backup: pairing credentials and import receipts are local to this browser/app.

## Files

| File | Responsibility |
| --- | --- |
| `index.html`, `canele.js` | Single connection dialog, consent, status and accessible controls |
| `device-link.js` | Claim, physical confirmation, polling, reconnect and disconnect |
| `device-progress.js`, `device-records.js` | Snapshot validation, record provenance and idempotent imports |
| `app.js` | Atomic save bridge, timer display and tab ownership |
| `focus-icons.js`, `woodland.css`, `locale.js` | Icons, layout, themes and translations |

Deployment and second-computer setup: [SCREEN_PAIRING.md](SCREEN_PAIRING.md). Firmware and host tests: [hardware/README.md](../hardware/README.md).

The source and simulated tests do not establish that the cloud endpoints are deployed or the physical device has been flashed. Local standalone HTML keeps the game available offline; pairing requires the hosted API or the packaged desktop API bridge.
