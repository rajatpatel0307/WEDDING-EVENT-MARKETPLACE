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
      <span className="eyebrow text-[10px] tracking-[2.5px] font-semibold flex items-center gap-[10px] [color:#916a65] [&_>_span]:w-[6px] [&_>_span]:h-[6px] [&_>_span]:[background:#956d67] [&_>_span]:rounded-full">YOUR MARRYNEST ACCOUNT</span>
      <h1>My profile</h1>
      <div className="dashboard-card bg-white [border:1px_solid_#eee1e6] rounded-[10px] [padding:35px] [color:#9a707f] [&_h2]:text-[26px] [&_h2]:[margin:20px_0_12px] [&_h2]:[color:#5e434e] [&_p]:text-[13px] [&_p]:leading-[1.9] [&_.text-link]:mt-[20px] [&_.text-link]:text-[12px] max-[850.001px]:[padding:25px]" aria-busy={busy}>
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
        <Link className="text-link [color:#8c414e] font-medium inline-flex items-center gap-[7px] [&:hover]:underline" to="/auth/change-password">
          Manage account security
        </Link>
      </div>
    </AccountLayout>
  );
}
