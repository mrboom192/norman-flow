// "Reusable tools" tutorial videos (Menu → Reusable tools videos).
// Edit this list to add videos: paste a share link (YouTube, Google Drive,
// etc.) into `url`. Videos without a url show as "Video coming soon".

export type ToolId = "excel" | "colab" | "powerbi" | "sheets";

export type Tool = {
  id: ToolId;
  name: string;
  /** One line about what the tool is for. */
  about: string;
  /** Still being built: shown with an "In development" tag. */
  inDevelopment?: boolean;
};

export type ToolVideo = {
  id: string;
  tool: ToolId;
  title: string;
  description: string;
  /** e.g. "6 min" */
  length?: string;
  /** Share link to the video. Leave out until the video is ready. */
  url?: string;
};

export const tools: Tool[] = [
  {
    id: "excel",
    name: "Norman Flow Excel tool",
    about:
      "The macro-enabled workbook City staff use to re-rank with new data. It creates the results file the app imports.",
  },
  {
    id: "colab",
    name: "Google Colab notebook",
    about:
      "The same analysis as the Excel tool, run in a browser notebook. Both give identical results.",
  },
  {
    id: "powerbi",
    name: "Power BI",
    about: "Dashboards for exploring the rankings.",
    inDevelopment: true,
  },
  {
    id: "sheets",
    name: "Google Sheets",
    about: "A shared-spreadsheet version of the tool.",
    inDevelopment: true,
  },
];

export const toolVideos: ToolVideo[] = [
  {
    id: "excel-rerank",
    tool: "excel",
    title: "Re-rank with new traffic and crash data",
    description:
      "Add a new year of counts and crashes, run the macros, and check the results.",
  },
  {
    id: "excel-export",
    tool: "excel",
    title: "Create the results file and import it into the app",
    description:
      "Export norman_flow_rankings.csv, then use Add new data & re-rank in Norman Flow.",
  },
  {
    id: "colab-run",
    tool: "colab",
    title: "Run the analysis in Google Colab",
    description:
      "Open the notebook, upload the data files, run every cell and download the results.",
  },
  {
    id: "powerbi-overview",
    tool: "powerbi",
    title: "Explore the rankings in Power BI",
    description: "A tour of the dashboards once the Power BI tool is ready.",
  },
  {
    id: "sheets-overview",
    tool: "sheets",
    title: "Update the rankings in Google Sheets",
    description: "How the Google Sheets version works once it is ready.",
  },
];
