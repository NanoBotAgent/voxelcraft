// Scheduler.js - Tick scheduler (20 TPS game tick)
export class Scheduler {
  constructor() {
    this.tasks = [];
    this.nextId = 0;
  }

  schedule(delayTicks, callback) {
    const id = this.nextId++;
    this.tasks.push({ id, remaining: delayTicks, callback, recurring: false });
    return id;
  }

  scheduleRecurring(intervalTicks, callback) {
    const id = this.nextId++;
    this.tasks.push({ id, remaining: intervalTicks, callback, recurring: true, interval: intervalTicks });
    return id;
  }

  cancel(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
  }

  tick() {
    const toRun = [];
    const remaining = [];

    for (const task of this.tasks) {
      task.remaining--;
      if (task.remaining <= 0) {
        toRun.push(task);
        if (task.recurring) {
          task.remaining = task.interval;
          remaining.push(task);
        }
      } else {
        remaining.push(task);
      }
    }

    this.tasks = remaining;

    for (const task of toRun) {
      try {
        task.callback();
      } catch (err) {
        console.error('Scheduler task error:', err);
      }
    }
  }
}
