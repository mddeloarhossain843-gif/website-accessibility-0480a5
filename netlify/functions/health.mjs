
export default async (request) => {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "Anondo Vromon server function is working"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
};

export const config = {
  path: "/api/health"
};
