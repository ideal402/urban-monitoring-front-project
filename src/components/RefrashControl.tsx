import './RefreshControl.css';

interface RefreshControlProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function RefreshControl({ lastUpdated, onRefresh, isRefreshing }: RefreshControlProps) {
  // 시간을 오전/오후 HH:MM:SS 포맷으로 변환
  const timeString = lastUpdated
    ? lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '데이터 로딩 중...';

  return (
    <div className="refresh-control-container">
      <span className="update-time">마지막 업데이트: {timeString}</span>
      <button
        className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
        onClick={onRefresh}
        disabled={isRefreshing}
        title="데이터 새로고침"
      >
        ↻
      </button>
    </div>
  );
}