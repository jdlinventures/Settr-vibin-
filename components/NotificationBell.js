"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id || notification.id);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-[#f5f5f5] transition-colors relative"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-neutral-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#171717] text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 glass-panel border border-[#e5e5e5] rounded-xl shadow-lg z-50 animate-[fadeIn_150ms_ease-out]">
          {/* Header */}
          <div className="p-3 border-b border-[#e5e5e5] flex items-center justify-between">
            <span className="font-semibold text-sm text-[#171717]">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-neutral-500 hover:text-[#171717] transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-neutral-400 text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => {
                const notificationId = notification._id || notification.id;
                const content = (
                  <div
                    className={`p-3 border-b border-[#f0f0f0] hover:bg-[#f5f5f5] transition-colors cursor-pointer ${
                      !notification.isRead ? "bg-[#fafafa]" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-[#171717]">
                          {notification.title}
                        </div>
                        {notification.body && (
                          <div className="text-sm text-neutral-500 truncate">
                            {notification.body}
                          </div>
                        )}
                        <div className="text-[11px] text-neutral-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="flex-shrink-0 pt-1">
                          <div className="w-2 h-2 bg-[#171717] rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );

                return notification.link ? (
                  <Link href={notification.link} key={notificationId}>
                    {content}
                  </Link>
                ) : (
                  <div key={notificationId}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
