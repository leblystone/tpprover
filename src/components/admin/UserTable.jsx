import React from 'react';

export default function UserTable({ users, searchTerm, theme, onViewUser }) {
  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const name = user.displayName?.toLowerCase() || '';
    return email.includes(term) || name.includes(term);
  });

  if (filteredUsers.length === 0) {
    return <p style={{ color: theme.textLight }}>No users found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y" style={{ borderColor: theme.border }}>
        <thead style={{ backgroundColor: theme.background }}>
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>User</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Status</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Last Active</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          {filteredUsers.map(user => (
            <tr key={user.uid}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <img className="h-10 w-10 rounded-full" src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`} alt="" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium" style={{ color: theme.text }}>{user.displayName || 'No Name'}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.textLight }}>
                {user.lastActive?.toDate().toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onClick={() => onViewUser(user)} className="text-indigo-600 hover:text-indigo-900">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


