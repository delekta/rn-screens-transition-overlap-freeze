# RNScreens nested-stack freeze

iOS main-thread freeze when presenting a **native-stack modal** overlaps
**unmounting a sibling native stack** (`UINavigationController`).

This is a minimal reproduction of an underlying `react-native-screens`/UIKit
transition race.

## Required

1. iOS (New Architecture; use Release if Debug does not hang).
2. A root `createNativeStackNavigator` presents a nested native stack with
   `presentation: 'modal'`.
3. A second `createNativeStackNavigator` is mounted as a sibling of the root
   `NavigationContainer`.
4. Mounting the modal immediately unmounts that sibling stack through
   conditional rendering.

Magenta spinner/tick stopping means the main thread is dead.

## Not required

A bottom sheet, custom keyboard, `reloadInputViews`, keyboard animation,
application UI, JS stack, or event logging.

The sibling stack is hosted in a fixed plain `View`. The important operation is
removing its native navigation controller while the root modal presentation is
in progress.

## Repro

1. Leave **Unmount nested stack 1s later** off.
2. Tap **Show nested native-stack**.
3. Tap **Present modal** (or header **Modal**).
4. Tick freezes.

Use **Unmount nested stack 1s later** as a timing control to compare immediate
unmount with teardown after the modal presentation has had time to finish.
