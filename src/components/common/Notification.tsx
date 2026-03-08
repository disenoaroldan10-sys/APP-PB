import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface NotificationProps {
  notification: {
    show: boolean;
    message: string;
    type: 'success' | 'error';
  } | null;
  setNotification: (notif: any) => void;
}

export const Notification: React.FC<NotificationProps> = ({ notification, setNotification }) => {
  return (
    <AnimatePresence>
      {notification?.show && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          className="fixed bottom-8 left-1/2 z-[100] w-full max-w-md px-4"
        >
          <div className={cn(
            "rounded-2xl p-4 shadow-2xl border flex items-center justify-between gap-4",
            notification.type === 'success' 
              ? "bg-white border-emerald-100 text-emerald-900 shadow-emerald-100/50" 
              : "bg-white border-red-100 text-red-900 shadow-red-100/50"
          )}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
              )}
              <p className="text-sm font-bold leading-tight">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification({ ...notification, show: false })}
              className="p-2 hover:bg-gray-50 rounded-xl transition-colors shrink-0"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
