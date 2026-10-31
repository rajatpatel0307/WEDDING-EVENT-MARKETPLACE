import axios from "axios";
import { mutate } from "../../services/apollo";
const graphql =
  import.meta.env.VITE_GRAPHQL_URL || "http://localhost:5000/graphql";
const graphqlOrigin = new URL(graphql, window.location.origin).origin;
export const communicationBase =
  import.meta.env.VITE_COMMUNICATION_API_URL ||
  `${graphqlOrigin}/api/communication`;
export const communicationOrigin = new URL(
  communicationBase,
  window.location.origin,
).origin;
export async function communicationRequest(
  role,
  path,
  options = {},
  retry = true,
) {
  try {
    const r = await axios({
      url: `${communicationBase}${path}`,
      withCredentials: true,
      ...options,
      headers: {
        "X-Communication-Role": role,
        "X-Communication-Request": "1",
        ...options.headers,
      },
    });
    return options.responseType === "blob" ? r.data : r.data.data;
  } catch (e) {
    if (e.response?.status === 401 && retry) {
      await mutate("refreshToken");
      return communicationRequest(role, path, options, false);
    }
    throw new Error(
      e.response?.data?.message ||
        e.message ||
        "Unable to complete this request.",
    );
  }
}
