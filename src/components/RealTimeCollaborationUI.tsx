/**
 * Real-Time Collaboration UI Components
 *
 * This module provides React components for displaying real-time collaboration
 * features including presence indicators, typing indicators, read receipts,
 * and connection status.
 */

import React, { useEffect, useState } from 'react';
import type {
  UserPresence,
  TypingIndicator,
  ReadReceipt,
  ConnectionState,
} from '../context/RealTimeCollaboration';

/**
 * Props for presence indicator component
 */
export interface PresenceIndicatorProps {
  users: UserPresence[];
  maxVisible?: number;
  showStatus?: boolean;
  showLocation?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: (user: UserPresence) => void;
}

/**
 * Component showing user presence indicators
 */
export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  users,
  maxVisible = 5,
  showStatus = true,
  showLocation = false,
  size = 'md',
  className = '',
  onClick,
}) => {
  const visibleUsers = users.slice(0, maxVisible);
  const hiddenCount = Math.max(0, users.length - maxVisible);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const statusColors = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  if (users.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <div
            key={user.userId}
            className={`relative rounded-full border-2 border-white cursor-pointer hover:z-10 ${sizeClasses[size]}`}
            onClick={() => onClick?.(user)}
            title={`${user.userId} - ${user.status}${user.customStatus ? ` (${user.customStatus})` : ''}`}
          >
            {/* User avatar placeholder */}
            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-medium">
              {user.userId.charAt(0).toUpperCase()}
            </div>

            {/* Status indicator */}
            {showStatus && (
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusColors[user.status]}`}
              />
            )}
          </div>
        ))}

        {hiddenCount > 0 && (
          <div
            className={`relative rounded-full border-2 border-white bg-gray-300 flex items-center justify-center text-gray-600 font-medium ${sizeClasses[size]}`}
            title={`+${hiddenCount} more users`}
          >
            +{hiddenCount}
          </div>
        )}
      </div>

      {/* User details tooltip area */}
      {showLocation && visibleUsers.length > 0 && (
        <div className="hidden group-hover:block absolute top-full mt-2 p-2 bg-black text-white text-xs rounded shadow-lg z-50">
          {visibleUsers.map((user) => (
            <div key={user.userId} className="mb-1 last:mb-0">
              <span className="font-medium">{user.userId}</span>
              {user.location && (
                <span className="text-gray-300 ml-2">
                  {user.location.city}, {user.location.country}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Props for typing indicator component
 */
export interface TypingIndicatorProps {
  typingUsers: TypingIndicator[];
  conversationId?: string;
  maxVisible?: number;
  className?: string;
  showAgentStatus?: boolean;
}

/**
 * Component showing typing indicators
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  conversationId,
  maxVisible = 3,
  className = '',
  showAgentStatus = true,
}) => {
  const filteredUsers = conversationId
    ? typingUsers.filter((t) => t.conversationId === conversationId)
    : typingUsers;

  const visibleUsers = filteredUsers.slice(0, maxVisible);
  const hiddenCount = Math.max(0, filteredUsers.length - maxVisible);

  if (filteredUsers.length === 0) {
    return null;
  }

  const formatTypingMessage = () => {
    if (visibleUsers.length === 1) {
      const user = visibleUsers[0];
      const agentLabel = showAgentStatus && user.isAgent ? ' (Agent)' : '';
      return `${user.userId}${agentLabel} is typing...`;
    } else if (visibleUsers.length === 2) {
      return `${visibleUsers[0].userId} and ${visibleUsers[1].userId} are typing...`;
    } else {
      const remaining =
        hiddenCount > 0
          ? ` and ${hiddenCount} other${hiddenCount > 1 ? 's' : ''}`
          : '';
      return `${visibleUsers[0].userId}, ${visibleUsers[1].userId}${remaining} are typing...`;
    }
  };

  return (
    <div
      className={`flex items-center space-x-2 text-gray-500 text-sm ${className}`}
    >
      {/* Animated typing dots */}
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
      </div>

      {/* Typing message */}
      <span className="italic">{formatTypingMessage()}</span>
    </div>
  );
};

/**
 * Props for read receipts component
 */
export interface ReadReceiptsProps {
  messageId: string;
  receipts: ReadReceipt[];
  maxVisible?: number;
  showTimestamp?: boolean;
  className?: string;
}

/**
 * Component showing read receipts for a message
 */
export const ReadReceipts: React.FC<ReadReceiptsProps> = ({
  messageId,
  receipts,
  maxVisible = 3,
  showTimestamp = false,
  className = '',
}) => {
  if (receipts.length === 0) {
    return null;
  }

  const visibleReceipts = receipts.slice(0, maxVisible);
  const hiddenCount = Math.max(0, receipts.length - maxVisible);

  return (
    <div
      className={`flex items-center space-x-1 text-xs text-gray-500 ${className}`}
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>

      <span>
        Read by {visibleReceipts.map((r) => r.readBy).join(', ')}
        {hiddenCount > 0 &&
          ` and ${hiddenCount} other${hiddenCount > 1 ? 's' : ''}`}
      </span>

      {showTimestamp && visibleReceipts.length > 0 && (
        <span className="text-gray-400">
          at{' '}
          {visibleReceipts[
            visibleReceipts.length - 1
          ].readAt.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

/**
 * Props for connection status component
 */
export interface ConnectionStatusProps {
  connectionState: ConnectionState;
  showDetails?: boolean;
  showLatency?: boolean;
  className?: string;
  onReconnect?: () => void;
}

/**
 * Component showing connection status
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connectionState,
  showDetails = false,
  showLatency = false,
  className = '',
  onReconnect,
}) => {
  const statusConfig = {
    connected: {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: '●',
      label: 'Connected',
    },
    connecting: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      icon: '◐',
      label: 'Connecting...',
    },
    reconnecting: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      icon: '◑',
      label: 'Reconnecting...',
    },
    disconnected: {
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      icon: '○',
      label: 'Disconnected',
    },
    error: {
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      icon: '✕',
      label: 'Connection Error',
    },
  };

  const config = statusConfig[connectionState.status];

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div
        className={`flex items-center space-x-2 px-2 py-1 rounded-full ${config.bgColor}`}
      >
        <span className={`text-sm ${config.color}`}>{config.icon}</span>
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>

        {showLatency &&
          connectionState.latency &&
          connectionState.status === 'connected' && (
            <span className="text-xs text-gray-500">
              ({connectionState.latency}ms)
            </span>
          )}
      </div>

      {showDetails &&
        connectionState.status === 'error' &&
        connectionState.error && (
          <div
            className="text-xs text-red-600 max-w-xs truncate"
            title={connectionState.error.message}
          >
            {connectionState.error.message}
          </div>
        )}

      {connectionState.status === 'error' && onReconnect && (
        <button
          onClick={onReconnect}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Retry
        </button>
      )}

      {showDetails && connectionState.status === 'reconnecting' && (
        <div className="text-xs text-gray-500">
          Attempt {connectionState.reconnectAttempts + 1}
        </div>
      )}
    </div>
  );
};

/**
 * Props for collaboration panel component
 */
export interface CollaborationPanelProps {
  users: UserPresence[];
  typingUsers: TypingIndicator[];
  connectionState: ConnectionState;
  conversationId?: string;
  onUserClick?: (user: UserPresence) => void;
  onReconnect?: () => void;
  className?: string;
}

/**
 * Comprehensive collaboration panel component
 */
export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  users,
  typingUsers,
  connectionState,
  conversationId,
  onUserClick,
  onReconnect,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const onlineUsers = users.filter((u) => u.status === 'online');
  const conversationTyping = conversationId
    ? typingUsers.filter((t) => t.conversationId === conversationId)
    : typingUsers;

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-medium text-gray-900">Collaboration</h3>
          <PresenceIndicator
            users={onlineUsers}
            maxVisible={3}
            size="sm"
            onClick={onUserClick}
          />
        </div>

        <div className="flex items-center space-x-2">
          <ConnectionStatus
            connectionState={connectionState}
            onReconnect={onReconnect}
          />
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t p-3 space-y-3">
          {/* Online users */}
          {onlineUsers.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">
                Online ({onlineUsers.length})
              </h4>
              <div className="space-y-2">
                {onlineUsers.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => onUserClick?.(user)}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                      {user.userId.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {user.userId}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            user.status === 'online'
                              ? 'bg-green-500'
                              : user.status === 'idle'
                                ? 'bg-yellow-500'
                                : user.status === 'busy'
                                  ? 'bg-red-500'
                                  : 'bg-gray-400'
                          }`}
                        />
                        <span className="text-xs text-gray-500 capitalize">
                          {user.status}
                        </span>
                        {user.customStatus && (
                          <span className="text-xs text-gray-500">
                            - {user.customStatus}
                          </span>
                        )}
                      </div>
                    </div>
                    {user.currentConversation === conversationId && (
                      <div className="text-xs text-green-600 font-medium">
                        In chat
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Typing indicators */}
          {conversationTyping.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">
                Currently Typing
              </h4>
              <TypingIndicator
                typingUsers={conversationTyping}
                showAgentStatus={true}
                className="px-2 py-1 bg-gray-50 rounded"
              />
            </div>
          )}

          {/* Connection details */}
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">
              Connection
            </h4>
            <ConnectionStatus
              connectionState={connectionState}
              showDetails={true}
              showLatency={true}
              onReconnect={onReconnect}
            />
            {connectionState.connectedAt && (
              <div className="text-xs text-gray-500 mt-1">
                Connected since{' '}
                {connectionState.connectedAt.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact inline collaboration indicators
 */
export interface InlineCollaborationProps {
  users: UserPresence[];
  typingUsers: TypingIndicator[];
  connectionState: ConnectionState;
  conversationId?: string;
  className?: string;
}

export const InlineCollaboration: React.FC<InlineCollaborationProps> = ({
  users,
  typingUsers,
  connectionState,
  conversationId,
  className = '',
}) => {
  const onlineUsers = users.filter((u) => u.status === 'online');
  const conversationTyping = conversationId
    ? typingUsers.filter((t) => t.conversationId === conversationId)
    : typingUsers;

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Connection indicator */}
      <ConnectionStatus connectionState={connectionState} />

      {/* Presence indicators */}
      {onlineUsers.length > 0 && (
        <PresenceIndicator users={onlineUsers} maxVisible={3} size="sm" />
      )}

      {/* Typing indicators */}
      {conversationTyping.length > 0 && (
        <TypingIndicator typingUsers={conversationTyping} maxVisible={2} />
      )}
    </div>
  );
};

export default {
  PresenceIndicator,
  TypingIndicator,
  ReadReceipts,
  ConnectionStatus,
  CollaborationPanel,
  InlineCollaboration,
};
