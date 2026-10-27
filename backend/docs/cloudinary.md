# Cloudinary uploads

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `backend/.env` using your Cloudinary product environment credentials. Restart the backend after configuration. No frontend credentials or unsigned upload preset are needed. Signed requests use the Upload API over HTTPS.

After inspecting and backing up the existing database, run `npm run db:migrate` from `backend` to add the nullable `Users.ProfilePhotoUrl` column. Deploy this migration before starting the updated backend.

Customers and vendors can choose an optional profile photo during signup after entering an email. Signed upload tokens bind that photo to the email and expire after 24 hours. Changing the signup email clears its staged photo and documents. Signed-in users can replace their photo under their profile; the header displays the saved photo.

Profile photos accept PNG/JPEG and are publicly accessible. Vendor verification documents accept PDF/PNG/JPEG, are stored as authenticated raw assets, and remain accessible through the existing administrator-only document query. Each file is limited to 5 MB and checked by its file signature on the server. The server retrieves restricted documents using a short-lived signed download URL without exposing that URL to the client. Existing local documents remain readable using `DOCUMENT_STORAGE_PATH`.

Uploads fail with a configuration message when credentials are missing; there is no local fallback for new uploads. Live Cloudinary upload and administrator download verification requires valid credentials. Abandoned signup uploads and replaced photos currently remain in Cloudinary; the existing local cleanup command only cleans local abandoned documents. Review Cloudinary retention and storage usage accordingly.

Reference: [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference).
