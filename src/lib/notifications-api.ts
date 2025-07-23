import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Fetches notifications for the currently logged-in user.
 */
export async function getNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching notifications:", error);
    throw new Error("Impossible de récupérer les notifications.");
  }

  return data || [];
}

/**
 * Marks a single notification as read.
 * @param notificationId The ID of the notification to mark as read.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    console.error("Error marking notification as read:", error);
    throw new Error("Impossible de marquer la notification comme lue.");
  }
}

/**
 * Marks all unread notifications for the user as read.
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    console.error("Error marking all notifications as read:", error);
    throw new Error("Impossible de marquer toutes les notifications comme lues.");
  }
}

/**
 * Creates a new notification for a user.
 * This should ideally be called from a trusted server environment (like an Edge Function).
 * @param userId The ID of the user to notify.
 * @param message The notification message.
 * @param link Optional link for the notification.
 */
export async function createNotification(userId: string, message: string, link?: string) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      message,
      link: link || '#',
    });

  if (error) {
    console.error('Error creating notification:', error);
    // We don't throw here to not interrupt the main flow (e.g., invoice creation)
  }
}