import { getUserDisplayName, type AppUser } from '@/lib/users';

interface UserSelectProps {
  users: AppUser[];
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  allowUnassigned?: boolean;
  unassignedLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function UserSelect({
  users,
  value,
  onChange,
  placeholder = 'Select a user...',
  allowUnassigned = false,
  unassignedLabel = 'Unassigned',
  className = '',
  disabled = false,
}: UserSelectProps) {
  const resolvedValue = users.some((u) => u.id === value) ? value : allowUnassigned ? '' : value;

  return (
    <select
      value={resolvedValue}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      disabled={disabled}
    >
      <option value="">{allowUnassigned ? unassignedLabel : placeholder}</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {getUserDisplayName(user)}
        </option>
      ))}
    </select>
  );
}