import { Globe } from "@/components/globe-3d";
import { fetchJson, isSetupRequiredResponse } from "@/client/api";
import { redirect } from "react-router-dom";
import type { GraphData } from "@/lib/wiki-shared";
import { useLoaderData } from "react-router-dom";
import { RouteErrorBoundary } from "@/client/route-error-boundary";

export async function loader() {
  try {
    const graphData = await fetchJson<GraphData>("/api/graph");
    return graphData;
  } catch (error) {
    if (isSetupRequiredResponse(error)) {
      throw redirect("/setup");
    }
    console.error("Failed to load graph data:", error);
    return { nodes: [], edges: [] };
  }
}

export function Component() {
  const graphData = useLoaderData() as GraphData;
  return <Globe graphData={graphData} />;
}

export const ErrorBoundary = RouteErrorBoundary;
