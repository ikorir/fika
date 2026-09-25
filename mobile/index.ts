// The bundle entry (package.json "main"). The OS can start the app with no UI to run the morning reminder's
// background task (W12), and expo-router loads route modules, the root layout included, only when they render. So the
// task is defined here, before the router loads, or a headless start would find no task and the OS would drop it.
// Whether it is registered follows its flag, from the Today screen.
import { defineMorningReminderTask } from './src/reminders/background';

defineMorningReminderTask();

// A require, not an import: imports are hoisted, and the router must come after the definition.
require('expo-router/entry');
