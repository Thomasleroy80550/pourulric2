-- Create DELETE policy for error_logs to allow admins to delete logs
CREATE POLICY "Admins can delete error logs" ON error_logs
FOR DELETE TO authenticated
USING (is_admin(auth.uid()));