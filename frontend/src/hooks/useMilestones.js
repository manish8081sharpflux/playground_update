import { useState, useEffect, useRef } from 'react';

/**
 * useMilestones Hook - Epic 01 Story 06
 * Detects when student crosses coin milestones (100, 500, 1000, 5000)
 * Triggers celebration modal only once per milestone
 */
export default function useMilestones(currentBalance) {
  const [celebrationMilestone, setCelebrationMilestone] = useState(null);
  const previousBalance = useRef(currentBalance);
  const achievedMilestones = useRef(new Set());

  // Milestone thresholds
  const MILESTONES = [100, 500, 1000, 5000];

  useEffect(() => {
    // Check if balance increased and crossed a milestone
    if (currentBalance > previousBalance.current) {
      // Get previously seen milestones from local storage
      const seenMilestones = JSON.parse(localStorage.getItem('isf_milestones_seen') || '[]');
      const seenSet = new Set(seenMilestones);

      MILESTONES.forEach(milestone => {
        // Check if milestone was crossed (old balance < milestone <= new balance)
        // OR if this is the initial load (previous=0) and we haven't seen this high milestone yet?
        // Actually, to prevent "Welcome Back" popup spam, we should ONLY trigger if we CROSS it live.
        // But if previousBalance starts at 0 (due to state init), and then becomes 1000, it looks like a crossing.
        // We must rely on localStorage to know if we already celebrated this.

        if (
          currentBalance >= milestone &&
          !seenSet.has(milestone)
        ) {
          // If previous balance was 0 (initial load), we might not want to show it?
          // User said "show it one time when student logs in". 
          // If we want that behavior: Allow it, but mark as seen immediately.
          // If we want "only on actual achievement": We need real backend history.
          // Assuming "Persistent Popup" fix means "Don't show every page load".
          // So, show ONCE, mark seen, never show again.

          // Mark milestone as achieved/seen
          seenSet.add(milestone);
          localStorage.setItem('isf_milestones_seen', JSON.stringify([...seenSet]));

          // Trigger celebration
          setCelebrationMilestone(milestone);
        }
      });
    }

    // Update previous balance
    previousBalance.current = currentBalance;
  }, [currentBalance]);

  const closeCelebration = () => {
    setCelebrationMilestone(null);
  };

  return {
    celebrationMilestone,
    closeCelebration
  };
}
