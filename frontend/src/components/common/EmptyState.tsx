import { Button } from 'antd';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon = '📋', title, description, actionLabel, onAction }: Props) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px',
      background: 'var(--brand-primary-bg, #f0f7ff)',
      borderRadius: 12, border: '1px dashed #d9d9d9',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 4 }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: '#8c8c8c', maxWidth: 400, margin: '0 auto' }}>{description}</div>}
      {actionLabel && onAction && (
        <Button type="primary" onClick={onAction} style={{ marginTop: 16, borderRadius: 20, padding: '4px 24px' }}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
