import { useState } from "react";
import { Link } from "react-router-dom";
import { gql } from "@apollo/client";
import { AccountLayout } from "./AccountPages";
import { useAuth } from "../../../context/AuthContext";
import PhotoUpload from "../../../components/common/PhotoUpload";
import { client, userFields } from "../../../services/apollo";

export default function ProfilePage() {
  const { user, setUser, notify } = useAuth();
  const [busy, setBusy] = useState(false);
  async function save({ uploadToken }) {
    const { data } = await client.mutate({
      mutation: gql(
        `mutation UpdateProfilePhoto($uploadToken: String!) { updateProfilePhoto(uploadToken: $uploadToken) { success message user { ${userFields} } } }`,
      ),
      variables: { uploadToken },
    });
    setUser((current) => ({ ...current, ...data.updateProfilePhoto.user }));
    notify(data.updateProfilePhoto.message);
  }
  return (
    <AccountLayout>
      <span className="eyebrow">YOUR MARRYNEST ACCOUNT</span>
      <h1>My profile</h1>
      <div className="dashboard-card" aria-busy={busy}>
        <PhotoUpload
          url={user.profilePhotoUrl}
          onUploaded={save}
          onBusy={setBusy}
        />
        <h2>
          {user.firstName} {user.lastName}
        </h2>
        <p>{user.email}</p>
        <p>{user.phone}</p>
        <Link className="text-link" to="/auth/change-password">
          Manage account security
        </Link>
      </div>
    </AccountLayout>
  );
}
