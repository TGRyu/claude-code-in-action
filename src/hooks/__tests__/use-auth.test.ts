import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/actions", () => ({
  signIn: (...args: any[]) => mockSignIn(...args),
  signUp: (...args: any[]) => mockSignUp(...args),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: (...args: any[]) => mockCreateProject(...args),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("초기 상태", () => {
    it("isLoading이 false로 초기화되어야 함", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    it("signIn, signUp 함수가 정의되어야 함", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.signIn).toBeDefined();
      expect(result.current.signUp).toBeDefined();
    });
  });

  describe("signIn", () => {
    it("성공 시 익명 작업이 있으면 프로젝트로 변환하고 해당 프로젝트로 이동", async () => {
      const mockProject = { id: "project-1", name: "Test Project" };
      const mockAnonWork = {
        messages: [{ role: "user", content: "test" }],
        fileSystemData: { "/": {} },
      };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(mockAnonWork);
      mockCreateProject.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      const signInResult = await result.current.signIn(
        "test@example.com",
        "password123"
      );

      expect(signInResult.success).toBe(true);
      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(`/${mockProject.id}`);
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    it("성공 시 익명 작업이 없고 프로젝트가 있으면 최근 프로젝트로 이동", async () => {
      const mockProjects = [
        { id: "project-1", name: "Project 1" },
        { id: "project-2", name: "Project 2" },
      ];

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      const signInResult = await result.current.signIn(
        "test@example.com",
        "password123"
      );

      expect(signInResult.success).toBe(true);
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(`/${mockProjects[0].id}`);
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it("성공 시 익명 작업과 프로젝트가 모두 없으면 새 프로젝트 생성", async () => {
      const mockProject = { id: "new-project", name: "New Design" };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      const signInResult = await result.current.signIn(
        "test@example.com",
        "password123"
      );

      expect(signInResult.success).toBe(true);
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/New Design #\d+/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith(`/${mockProject.id}`);
    });

    it("실패 시 에러를 반환하고 리다이렉트하지 않음", async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      const signInResult = await result.current.signIn(
        "test@example.com",
        "wrongpassword"
      );

      expect(signInResult.success).toBe(false);
      expect(signInResult.error).toBe("Invalid credentials");
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
    });

    it("로딩 상태를 올바르게 관리", async () => {
      let resolveSignIn: any;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      mockSignIn.mockReturnValue(signInPromise);
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "p1", name: "Project 1" }]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const authPromise = result.current.signIn(
        "test@example.com",
        "password123"
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      resolveSignIn({ success: true });

      await authPromise;

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("익명 작업이 있지만 메시지가 비어있으면 무시하고 기존 프로젝트로 이동", async () => {
      const mockProjects = [{ id: "project-1", name: "Project 1" }];
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      mockGetProjects.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(`/${mockProjects[0].id}`);
      expect(mockCreateProject).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    it("성공 시 익명 작업이 있으면 프로젝트로 변환", async () => {
      const mockProject = { id: "project-1", name: "Test Project" };
      const mockAnonWork = {
        messages: [{ role: "user", content: "test" }],
        fileSystemData: { "/": {} },
      };

      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(mockAnonWork);
      mockCreateProject.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      const signUpResult = await result.current.signUp(
        "test@example.com",
        "password123"
      );

      expect(signUpResult.success).toBe(true);
      expect(mockSignUp).toHaveBeenCalledWith("test@example.com", "password123");
      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(`/${mockProject.id}`);
    });

    it("성공 시 익명 작업이 없으면 새 프로젝트 생성", async () => {
      const mockProject = { id: "new-project", name: "New Design" };

      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      const signUpResult = await result.current.signUp(
        "test@example.com",
        "password123"
      );

      expect(signUpResult.success).toBe(true);
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/New Design #\d+/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith(`/${mockProject.id}`);
    });

    it("실패 시 에러를 반환하고 리다이렉트하지 않음", async () => {
      mockSignUp.mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      const signUpResult = await result.current.signUp(
        "test@example.com",
        "password123"
      );

      expect(signUpResult.success).toBe(false);
      expect(signUpResult.error).toBe("Email already registered");
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("로딩 상태를 올바르게 관리", async () => {
      let resolveSignUp: any;
      const signUpPromise = new Promise((resolve) => {
        resolveSignUp = resolve;
      });
      mockSignUp.mockReturnValue(signUpPromise);
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "p1", name: "Project 1" }]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const authPromise = result.current.signUp(
        "test@example.com",
        "password123"
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      resolveSignUp({ success: true });

      await authPromise;

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("에러 처리", () => {
    it("signIn 중 예외 발생 시 로딩 상태를 올바르게 해제", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signIn("test@example.com", "password123")
      ).rejects.toThrow("Network error");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("signUp 중 예외 발생 시 로딩 상태를 올바르게 해제", async () => {
      mockSignUp.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signUp("test@example.com", "password123")
      ).rejects.toThrow("Network error");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("엣지 케이스", () => {
    it("getAnonWorkData가 null이 아니지만 유효하지 않은 데이터를 반환하는 경우", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockGetProjects.mockResolvedValue([{ id: "p1", name: "Project 1" }]);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it("createProject가 실패해도 에러를 던지면 로딩 상태 해제", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({
        messages: [{ role: "user", content: "test" }],
        fileSystemData: {},
      });
      mockCreateProject.mockRejectedValue(new Error("Create failed"));

      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signIn("test@example.com", "password123")
      ).rejects.toThrow("Create failed");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("여러 번 연속으로 signIn 호출 시 각각 독립적으로 처리", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "p1", name: "Project 1" }]);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test1@example.com", "password1");
      expect(mockSignIn).toHaveBeenCalledWith("test1@example.com", "password1");

      await result.current.signIn("test2@example.com", "password2");
      expect(mockSignIn).toHaveBeenCalledWith("test2@example.com", "password2");

      expect(mockSignIn).toHaveBeenCalledTimes(2);
    });
  });
});
