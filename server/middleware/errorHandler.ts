// Enhanced error handler for database constraint violations
export function errorHandler(err: any, _req: any, res: any, _next: any) {
  // Zod validation errors
  if (err?.issues) {
    return res.status(422).json({ 
      message: "Invalid input", 
      issues: err.issues 
    });
  }

  // Postgres not-null violation
  if (err?.code === "23502") {
    return res.status(400).json({
      message: `Missing required field: ${err.column || "unknown"}`,
      hint: "Check that all required fields are provided and not null.",
    });
  }
  
  // Foreign key violation (bad schoolId/studentId/etc)
  if (err?.code === "23503") {
    return res.status(400).json({ 
      message: "Related record not found. Please verify the referenced IDs exist.",
      detail: err.detail || "Foreign key constraint violation"
    });
  }
  
  // Unique constraint violation
  if (err?.code === "23505") {
    return res.status(409).json({
      message: "Duplicate entry. This record already exists.",
      detail: err.detail || "Unique constraint violation"
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ message: "Unexpected server error" });
}