interface TimerProps {
  readonly timeRemaining: number;
  readonly totalTime: number;
}

export function Timer({ timeRemaining, totalTime }: TimerProps) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? timeRemaining / totalTime : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = timeRemaining <= 10;

  const strokeColor = isUrgent ? '#EF4444' : '#7C3AED';
  const textColor = isUrgent ? 'text-red-500' : 'text-[var(--color-primary)]';
  const urgentClass = isUrgent ? 'animate-pulse-urgent' : '';

  return (
    <div className={`relative inline-flex items-center justify-center w-20 h-20 mb-4 ${urgentClass}`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        {/* Background circle */}
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="5"
        />
        {/* Progress circle */}
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span
        className={`absolute text-xl font-extrabold ${textColor} transition-colors duration-300`}
      >
        {timeRemaining}
      </span>
    </div>
  );
}
