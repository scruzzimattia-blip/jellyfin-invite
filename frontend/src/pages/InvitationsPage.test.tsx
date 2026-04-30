import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import { InvitationsPage } from "./InvitationsPage";

vi.mock("../api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-id", username: "admin" },
    logout: vi.fn()
  })
}));

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InvitationsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("InvitationsPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("renders invitation rows from API data", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        {
          id: "invite-id",
          token: "abcdef1234567890",
          createdBy: "admin-id",
          email: "guest@example.com",
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          maxUses: 3,
          useCount: 1,
          revokedAt: null
        }
      ]
    });

    renderWithProviders();

    expect(await screen.findByText("guest@example.com")).toBeInTheDocument();
    expect(screen.getByText("abcdef12...")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getAllByText("Aktiv")).toHaveLength(2);
  });
});
