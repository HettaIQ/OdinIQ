import { login } from "../actions/login";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold">
          Welcome to OdinIQ
        </h1>

        <p className="mb-8 text-gray-600">
          Sign in to continue
        </p>

        <form action={login} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Email
            </label>

            <input
              name="email"
              type="email"
              className="w-full rounded-lg border p-3"
              placeholder="jamie@odiniq.co.uk"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Password
            </label>

            <input
              name="password"
              type="password"
              className="w-full rounded-lg border p-3"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-black py-3 text-white"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}