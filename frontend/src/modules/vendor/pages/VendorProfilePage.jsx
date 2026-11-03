import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { gql } from "@apollo/client";
import { useAuth } from "../../../context/AuthContext";
import { client, userFields } from "../../../services/apollo";
import PhotoUpload from "../../../components/common/PhotoUpload";
import {
  Field,
  Heading,
  Panel,
  Loading,
  ErrorView,
  useVendorData,
} from "../components/WorkspaceUI";
import { save } from "../services/workspace.api";
export default function VendorProfilePage() {
  const { user, setUser, reload, notify } = useAuth();
  const resource = useVendorData("/profile");
  const [values, setValues] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (resource.data)
      setValues({
        firstName: resource.data.firstName,
        lastName: resource.data.lastName || "",
        phone: resource.data.phone || "",
      });
  }, [resource.data]);
  async function photo({ uploadToken }) {
    const { data } = await client.mutate({
      mutation: gql(
        `mutation UpdateProfilePhoto($uploadToken: String!) { updateProfilePhoto(uploadToken: $uploadToken) { success message user { ${userFields} } } }`,
      ),
      variables: { uploadToken },
    });
    setUser((current) => ({ ...current, ...data.updateProfilePhoto.user }));
    notify(data.updateProfilePhoto.message);
    resource.retry();
  }
  if (resource.error)
    return <ErrorView error={resource.error} retry={resource.retry} />;
  if (!values || !resource.data) return <Loading />;
  return (
    <>
      <Heading
        title="Profile"
        description="View and update your basic account information."
      />
      <Panel title="Your profile">
        <form
          className="grid gap-5 p-6"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const result = await save("/profile", "PUT", {
                ...values,
                expectedUpdatedAt: resource.data.updatedAt,
              });
              await reload();
              resource.retry();
              notify(result.message);
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <PhotoUpload
            url={user.profilePhotoUrl}
            onUploaded={photo}
            onBusy={setBusy}
          />
          {error && <p role="alert">{error}</p>}
          <fieldset
            disabled={busy}
            className="grid gap-4 border-0 p-0 sm:grid-cols-2"
          >
            {[
              ["firstName", "First name", 100],
              ["lastName", "Last name", 100],
              ["phone", "Phone", 20],
            ].map(([key, label, maxLength]) => (
              <Field
                key={key}
                label={label}
                value={values[key]}
                maxLength={maxLength}
                required={key === "firstName"}
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }))
                }
              />
            ))}
            <Field label="Email" value={resource.data.email} disabled />
          </fieldset>
          <button
            type="submit"
            disabled={busy}
            className="justify-self-start rounded-md bg-[#386348] px-5 py-3 text-white disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save profile"}
          </button>
          <Link to="/auth/change-password" className="text-[#386348] underline">
            Manage account security
          </Link>
        </form>
      </Panel>
    </>
  );
}
