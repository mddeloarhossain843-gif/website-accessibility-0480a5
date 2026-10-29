
import { neon } from "@neondatabase/serverless";

export default async () => {
  try {
    if (!process.env.DATABASE_URL) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "DATABASE_URL environment variable is missing"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`
      SELECT current_database() AS database_name,
             current_schema() AS schema_name
    `;

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Neon database connection successful",
        database: result[0].database_name,
        schema: result[0].schema_name
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      }
    );
  } catch (error) {
    console.error("Database health check failed:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Database connection failed"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      }
    );
  }
};

export const config = {
  path: "/api/db-health"
};
