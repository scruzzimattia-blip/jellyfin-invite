import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

const loginMock = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    login: loginMock
  })
}));

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it("renders Jellyfin credential fields", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/passwort/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /einloggen/i })).toBeInTheDocument();
  });

  it("submits username and password to the auth hook", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/passwort/i), "secret-password");
    await user.click(screen.getByRole("button", { name: /einloggen/i }));

    expect(loginMock).toHaveBeenCalledWith("admin", "secret-password");
  });
});
