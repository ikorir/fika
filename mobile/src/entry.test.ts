// The bundle entry, `mobile/index.ts`. The OS can start the app with no UI to run the morning reminder's background
// task, and expo-router loads route modules (the root layout included) only when they render, so the task has to be
// defined here, before the router.
import * as TaskManager from 'expo-task-manager';

import { MORNING_TASK } from '@/reminders/background';

const mockOrder: string[] = [];
jest.mock('expo-router/entry', () => {
  mockOrder.push('router');
  return {};
});
jest.mock('expo-task-manager', () => {
  const tasks = new Map();
  return {
    defineTask: jest.fn((name: string, run: unknown) => {
      mockOrder.push(`define ${name}`);
      tasks.set(name, run);
    }),
    isTaskDefined: (name: string) => tasks.has(name),
  };
});
// What the task runs with is not this test's concern.
jest.mock('@/reminders/notifications', () => ({ morningReminderPending: jest.fn(), replaceMorningReminder: jest.fn() }));

describe('the bundle entry', () => {
  it('defines the morning reminder task, then loads the router', () => {
    require('../index');
    expect(TaskManager.isTaskDefined(MORNING_TASK)).toBe(true);
    expect(mockOrder).toEqual([`define ${MORNING_TASK}`, 'router']);
  });

  it('is what package.json starts the app from', () => {
    expect(require('../package.json').main).toBe('index.ts');
  });
});
