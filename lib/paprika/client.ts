// lib/paprika/client.ts

export interface PaprikaLoginResult {
  result?: {
    token?: string;
  };
}

export interface PaprikaRecipeRaw {
  uid?: string;
  name?: string;
  categories?: string[];
  [key: string]: unknown;
}

export interface PaprikaCategory {
  uid?: string;
  name?: string;
  parent_uid?: string | null;
  order_flag?: number;
  [key: string]: unknown;
}

export class PaprikaClient {
  private email: string;
  private password: string;
  private token: string | null = null;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  /**
   * Logs into Paprika using the v2 account login endpoint.
   * Expects a token inside result.token in the JSON response.
   */
  async login(): Promise<void> {
    const body = new URLSearchParams();
    body.set("email", this.email);
    body.set("password", this.password);

    const res = await fetch("https://paprikaapp.com/api/v2/account/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Paprika/3.0 (iPhone; iOS 17.0; Scale/3.00)",
        "Accept": "application/json",
      },
      body: body.toString(),
    });

    const data = (await res.json()) as unknown;

    // Check for error in response body (even if HTTP status is 200)
    if (data && typeof data === "object" && "error" in data) {
      const error = (data as any).error;
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? error.message
          : JSON.stringify(error);
      throw new Error(
        `Paprika login failed: ${errorMessage}${res.status ? ` (HTTP ${res.status})` : ""}`
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Paprika login failed with status ${res.status}${text ? `: ${text}` : ""}`
      );
    }

    // Try different possible response structures for token
    let token: string | undefined;
    
    // Structure 1: { result: { token: "..." } }
    if (data && typeof data === "object" && "result" in data) {
      const result = (data as any).result;
      if (result && typeof result === "object" && "token" in result) {
        token = result.token;
      }
    }
    
    // Structure 2: { token: "..." } (top level)
    if (!token && data && typeof data === "object" && "token" in data) {
      token = (data as any).token;
    }
    
    // Structure 3: { data: { token: "..." } }
    if (!token && data && typeof data === "object" && "data" in data) {
      const dataObj = (data as any).data;
      if (dataObj && typeof dataObj === "object" && "token" in dataObj) {
        token = dataObj.token;
      }
    }

    if (!token || typeof token !== "string") {
      // Include the actual response in the error for debugging
      const responseStr = JSON.stringify(data, null, 2);
      throw new Error(
        `Paprika login succeeded but no token was returned. Response: ${responseStr}`
      );
    }

    this.token = token;
  }

  /**
   * Fetches all recipes from the v2 sync endpoint.
   * Requires login() to have been called successfully first.
   */
  async getRecipes(): Promise<PaprikaRecipeRaw[]> {
    if (!this.token) {
      throw new Error("PaprikaClient.getRecipes called before login");
    }

    const res = await fetch("https://www.paprikaapp.com/api/v2/sync/recipes/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "Paprika/3.0 (iPhone; iOS 17.0; Scale/3.00)",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Paprika recipes fetch failed with status ${res.status}${
          text ? `: ${text}` : ""
        }`
      );
    }

    const data = (await res.json()) as unknown;

    // Some v2 endpoints wrap in { result: [...] }, others return an array.
    if (Array.isArray(data)) {
      return data as PaprikaRecipeRaw[];
    }

    if (
      data &&
      typeof data === "object" &&
      Array.isArray((data as any).result)
    ) {
      return (data as any).result as PaprikaRecipeRaw[];
    }

    throw new Error("Unexpected Paprika recipes response format");
  }

  /**
   * Fetches a single recipe by UID from the v2 sync endpoint.
   * Requires login() to have been called successfully first.
   */
  async getRecipe(recipeUid: string): Promise<PaprikaRecipeRaw> {
    if (!this.token) {
      throw new Error("PaprikaClient.getRecipe called before login");
    }

    const res = await fetch(
      `https://www.paprikaapp.com/api/v2/sync/recipe/${recipeUid}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "User-Agent": "Paprika/3.0 (iPhone; iOS 17.0; Scale/3.00)",
          "Accept": "application/json",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Paprika recipe fetch failed with status ${res.status}${
          text ? `: ${text}` : ""
        }`
      );
    }

    const data = (await res.json()) as unknown;

    // Some v2 endpoints wrap in { result: {...} }, others return the object directly.
    if (data && typeof data === "object") {
      if ("result" in data && typeof (data as any).result === "object") {
        return (data as any).result as PaprikaRecipeRaw;
      }
      return data as PaprikaRecipeRaw;
    }

    throw new Error("Unexpected Paprika recipe response format");
  }

  /**
   * Fetches all categories from the v2 sync endpoint.
   * Requires login() to have been called successfully first.
   */
  async getCategories(): Promise<PaprikaCategory[]> {
    if (!this.token) {
      throw new Error("PaprikaClient.getCategories called before login");
    }

    const res = await fetch("https://www.paprikaapp.com/api/v2/sync/categories/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "Paprika/3.0 (iPhone; iOS 17.0; Scale/3.00)",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Paprika categories fetch failed with status ${res.status}${
          text ? `: ${text}` : ""
        }`
      );
    }

    const data = (await res.json()) as unknown;

    // Some v2 endpoints wrap in { result: [...] }, others return an array.
    if (Array.isArray(data)) {
      return data as PaprikaCategory[];
    }

    if (
      data &&
      typeof data === "object" &&
      Array.isArray((data as any).result)
    ) {
      return (data as any).result as PaprikaCategory[];
    }

    throw new Error("Unexpected Paprika categories response format");
  }
}

