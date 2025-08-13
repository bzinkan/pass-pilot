// Middleware to sanitize request bodies and prevent null/undefined values
export function sanitizeBody(req: any, _res: any, next: any) {
  const clean = (obj: any) =>
    Object.fromEntries(
      Object.entries(obj ?? {})
        .filter(([k, v]) => v !== null && v !== undefined && k !== "id") // drop id + nulls
        .map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
        .filter(([k, v]) => v !== "") // remove empty strings too
    );
    
  if (req.body && typeof req.body === "object") {
    req.body = clean(req.body);
  }
  
  next();
}