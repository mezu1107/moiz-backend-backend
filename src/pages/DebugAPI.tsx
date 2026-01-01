// src/pages/DebugAPI.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiClient } from "@/lib/api";

type TestResult = {
  name: string;
  status: "PASS" | "FAIL";
  data?: any;
  error?: string;
};

export default function DebugAPI() {
  const [results, setResults] = useState<TestResult[]>([]);

  // Generic runner for API tests
  const runTest = async <T,>(name: string, fn: () => Promise<T>) => {
    try {
      const data = await fn();
      setResults((prev) => [...prev, { name, status: "PASS", data }]);
    } catch (err: any) {
      setResults((prev) => [...prev, { name, status: "FAIL", error: err.message }]);
    }
  };

  // Run all API tests
  const testAll = async () => {
    setResults([]);

    await runTest("Health Check", () =>
      apiClient.get<{ status: string }>("health")
    );

    await runTest("Public Areas", () =>
      apiClient.get<any[]>("/areas")
    );

    await runTest("Check Lahore", () =>
      apiClient.get("/areas/check", { params: { lat: 31.5204, lng: 74.3587 } })
    );

    await runTest("Check Karachi", () =>
      apiClient.get("/areas/check", { params: { lat: 24.8607, lng: 67.0011 } })
    );

    await runTest("Check Outside", () =>
      apiClient.get("/areas/check", { params: { lat: 40, lng: 70 } })
    );
  };

  useEffect(() => {
    testAll();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center">
          API Health Check
        </h1>

        <Button
          onClick={testAll}
          className="mb-6 w-full max-w-xs mx-auto block"
        >
          Run All Tests Again
        </Button>

        <div className="grid gap-4">
          {results.map((r, i) => (
            <Card
              key={i}
              className={`p-4 sm:p-6 border ${
                r.status === "PASS" ? "border-green-500" : "border-red-500"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h3 className="text-lg sm:text-xl font-bold">{r.name}</h3>
                <span
                  className={`px-3 py-1 rounded-full text-white font-bold text-sm sm:text-base ${
                    r.status === "PASS" ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <pre className="mt-2 sm:mt-4 text-sm bg-black/5 p-3 rounded overflow-x-auto">
                {JSON.stringify(r.status === "PASS" ? r.data : r.error, null, 2)}
              </pre>
            </Card>
          ))}
        </div>

        {results.length === 5 && results.every((r) => r.status === "PASS") && (
          <div className="text-center mt-8 sm:mt-12">
            <h2 className="text-3xl sm:text-5xl font-bold text-green-600 mb-2 sm:mb-4">
              ALL APIs WORKING PERFECTLY!
            </h2>
            <p className="text-lg sm:text-2xl">
              Your backend is 100% healthy
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
