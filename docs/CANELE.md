# Canele connection entry

The Focus header has a **Connect your canele** button immediately before the floating-mole button. It opens a bilingual pairing dialog that follows Eumo's day/night theme.

## Current scope

- Web interface only: pairing-code entry, empty-code feedback and an explicit unavailable state.
- No device discovery, pairing request, connection token, Wi-Fi setup or cloud sync is implemented by this change.
- A submitted code is neither transmitted nor stored. Closing the dialog clears it.
- Opening the dialog leaves the local focus session running. It does not write time, depth, rewards or inventory.

The planned accessory starts digging and records focus time and rewards. Its firmware and sync service will be reviewed separately before this interface is connected to them.

## Integration points

| File | Responsibility |
| --- | --- |
| `index.html` | `connectCaneleButton`, `caneleDialog`, `canelePairForm` |
| `canele.js` | Open/close lifecycle and temporary submit handling |
| `focus-icons.js` | `canele`: front/screen, disconnected; `caneleConnected`: fluted back, connected |
| `woodland.css` | Theme-aware button and dialog layout |
| `locale.js` | English/Chinese copy |

The input accepts text with a 64-character UI limit; it does not assume a numeric code length or change case. Confirm the actual firmware's code format and where users obtain the code before adding protocol validation.

Replace the unavailable submit handler only after the pairing API and authentication contract are confirmed. Change the connection icon and status only in response to a verified device binding; code entry alone is not proof of a connection. Distinguish a paired but offline device from one currently syncing.

Before importing progress, agree on session ownership, initial sync baseline, event IDs and reward reconciliation. Repeated syncs must not duplicate time or rewards, and a device import must preserve the existing game save. Sharing Wi-Fi alone does not authorize access to someone's progress.
