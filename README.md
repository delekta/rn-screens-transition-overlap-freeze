# RNScreens nested-stack freeze

iOS main-thread freeze when a **native-stack modal present** overlaps **unmounting another native-stack** (`UINavigationController`) that lives in a **3rd-party sheet**.

This is the Discord Apps + channel-details hang.

## Required

1. iOS (New Architecture; use Release if Debug does not hang).
2. Root `createNativeStackNavigator` presents a **nested** native-stack with `presentation: 'modal'`.
3. A second `createNativeStackNavigator` is mounted as a **sibling** of `NavigationContainer`, **inside `@discord/bottom-sheet`** (not a plain `View`).
4. The modal’s **mount** unmounts that second stack (`setState(false)`).

A sibling native-stack in a plain overlay is **not** this bug: presenting then still freezes even with a 1s delay. Discord’s Apps stack is in the sheet.

Magenta spinner/tick stopping means the main thread is dead.

## Not required

Apps list UI, members UI, `reloadInputViews`, keyboard animation, JS stack, event log.

Two native stacks existing at once also does **not** freeze (with the sheet). Unmounting the sheet stack **during** the present does. Unmounting 1s later does not.

## Repro

1. Leave **Unmount nested stack 1s later** off.
2. Tap **Show nested native-stack**.
3. Tap **Present modal** (or header **Modal**).
4. Tick freezes.

Turn the switch **on** and repeat: modal appears, nested stack goes away after 1s, no freeze.
