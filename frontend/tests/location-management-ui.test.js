import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("locations render catalog states and offer only active assignment destinations", async () => {
  const key = "__locationManagementFixture";
  const previous = globalThis[key];
  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    cacheDir: fileURLToPath(
      new URL("../node_modules/.vite-location-tests/", import.meta.url),
    ),
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false },
    plugins: [
      {
        name: "location-fixtures",
        enforce: "pre",
        resolveId(id) {
          if (id === "virtual:location-ui") return "\0location-ui";
          if (id.endsWith("/context/AuthContext")) return "\0location-auth";
          if (id === "../api") return "\0location-api";
          if (id === "../services-management.api") return "\0location-data";
          if (id === "../components/AdminTable")
            return "\0location-table-states";
        },
        load(id) {
          if (id === "\0location-auth")
            return "export const useAuth = () => ({ notify() {} });";
          if (id === "\0location-api")
            return "export const adminRequest = async () => ({ rows: [] });";
          if (id === "\0location-data")
            return `export const useAdminData = () => ({ ...globalThis.${key}, retry() {} });`;
          if (id === "\0location-table-states")
            return `
          import React from 'react';
          export const Skeleton = () => React.createElement('div', { role: 'status' }, 'Loading data');
          export const ErrorState = ({error}) => React.createElement('div', {role: 'alert'}, error.message);
        `;
          if (id === "\0location-ui")
            return `
          import React from 'react';
          import { renderToStaticMarkup } from 'react-dom/server';
          import { MemoryRouter } from 'react-router-dom';
          import LocationManagement, { LocationEditorPopup, VendorAssignmentPopup } from '/src/modules/admin/pages/LocationManagement.jsx';
          export function render(state) {
            globalThis.${key} = state;
            return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(LocationManagement)));
          }
          export function renderEditor(props = {}) {
            return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(LocationEditorPopup, {
              fields: {city: '', state: '', country: 'India', active: true}, setFields() {}, ready: true,
              onSubmit() {}, close() {}, onDismiss() {}, ...props,
            })));
          }
          export function renderAssignment(props = {}) {
            return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(VendorAssignmentPopup, {
              vendorId: '', locationId: '', locations: [], setVendorId() {}, setLocationId() {}, ready: true,
              onSubmit() {}, close() {}, onDismiss() {}, ...props,
            })));
          }
        `;
        },
      },
    ],
  });
  try {
    const { render, renderEditor, renderAssignment } =
      await server.ssrLoadModule("virtual:location-ui");
    const fixture = {
      data: {
        data: [
          {
            id: "lucknow",
            city: "Lucknow",
            state: "Uttar Pradesh",
            country: "India",
            active: true,
            approvedVendors: 2,
          },
          {
            id: "jaipur",
            city: "Jaipur",
            state: "Rajasthan",
            country: "India",
            active: false,
            approvedVendors: 3,
          },
          {
            id: "pune",
            city: "Pune",
            state: "Maharashtra",
            country: "India",
            active: true,
            approvedVendors: 0,
          },
          {
            id: "public-sarojni",
            city: "sarojni",
            state: "delhi",
            country: "India",
            active: true,
            approvedVendors: 1,
            managed: false,
            customerVisible: true,
          },
        ],
      },
    };
    const populated = render(fixture);
    assert.equal((populated.match(/aria-haspopup="dialog"/g) || []).length, 2);
    assert.match(populated, /Add a location/);
    assert.match(populated, /Assign a vendor/);
    assert.doesNotMatch(
      populated,
      /<dialog\b|<form\b|name="city"|name="vendorId"/,
    );
    const assignment = renderAssignment({ locations: fixture.data.data });
    assert.match(assignment, /<dialog\b/);
    assert.match(assignment, /<form[^>]*aria-label="Assign a vendor"/);
    assert.match(assignment, /aria-label="Close dialog"/);
    for (const text of [
      "Lucknow",
      "Jaipur",
      "Pune",
      "Visible to customers",
      "Waiting for approved vendors",
      "Hidden from customers",
      "Showing 4 of 4 locations",
      "sarojni",
      "Vendor address",
    ])
      assert.ok(populated.includes(text), text);
    const destinations = assignment.match(
      /<select[^>]*name="locationId"[^>]*>(.*?)<\/select>/s,
    )?.[1];
    assert.ok(destinations, "assignment destination select renders");
    assert.match(destinations, /value="lucknow"/);
    assert.match(destinations, /value="pune"/);
    assert.doesNotMatch(destinations, /value="jaipur"/);
    assert.doesNotMatch(destinations, /value="public-sarojni"/);
    const vendorRow = populated.match(
      /<tr[^>]*>(?:(?!<\/tr>).)*sarojni(?:(?!<\/tr>).)*<\/tr>/s,
    )?.[0];
    assert.ok(vendorRow);
    for (const action of ["Edit", "Deactivate"])
      assert.match(
        vendorRow,
        new RegExp(`aria-label="${action} sarojni, delhi"`),
      );
    assert.equal((vendorRow.match(/<button\b/g) || []).length, 2);
    assert.doesNotMatch(populated, /Manage vendors/);
    for (const row of populated
      .match(/<tr[^>]*>(?:(?!<\/tr>).)*<\/tr>/gs)
      .slice(1)) {
      assert.equal((row.match(/<button\b/g) || []).length, 2);
      assert.match(row, /title="Edit /);
      assert.match(row, /title="(?:Activate|Deactivate) /);
      assert.doesNotMatch(row, /(?:title|aria-label)="Delete /);
    }
    assert.match(
      assignment,
      /<button[^>]*type="submit"[^>]*disabled=""[^>]*aria-describedby="assignment-hint"/,
    );
    assert.match(populated, /aria-label="Edit Lucknow, Uttar Pradesh"/);
    assert.match(populated, /aria-label="Activate Jaipur, Rajasthan"/);

    const empty = render({ data: { data: [] } });
    assert.ok(empty.includes("Your next city starts here"));
    const emptyAssignment = renderAssignment();
    assert.ok(
      emptyAssignment.includes(
        "Add or activate a location before assigning a vendor.",
      ),
    );
    assert.match(emptyAssignment, /<fieldset disabled=""/);
    const editor = renderEditor();
    assert.match(editor, /<dialog\b/);
    assert.match(editor, /<form[^>]*aria-label="Add a location"/);
    for (const name of ["city", "state", "country"])
      assert.match(editor, new RegExp(`name="${name}"`));
    assert.match(editor, /autoFocus=""/i);
    assert.match(editor, />Cancel<\/button>/);
    assert.doesNotMatch(editor, /name="vendorId"|aria-label="Search vendors"/);
    assert.doesNotMatch(assignment, /name="city"/);
    const edit = renderEditor({
      editing: "lucknow",
      fields: fixture.data.data[0],
    });
    assert.match(edit, /<form[^>]*aria-label="Edit location"/);
    assert.match(edit, /value="Lucknow"/);
    assert.match(edit, /Save changes/);
    const invalid = renderEditor({ error: new Error("Enter a valid city") });
    assert.match(invalid, /role="alert"/);
    assert.match(invalid, /Enter a valid city/);
    const saving = renderEditor({ busy: true });
    assert.match(saving, /aria-label="Close dialog" disabled=""/);
    assert.match(saving, /<fieldset disabled=""/);
    assert.match(saving, /Saving/);
    const assigning = renderAssignment({
      busy: true,
      locations: fixture.data.data,
      vendorId: "vendor-1",
      locationId: "lucknow",
    });
    assert.match(assigning, /aria-label="Close dialog" disabled=""/);
    assert.match(assigning, /Assigning/);
    const loading = render({ loading: true });
    assert.ok(loading.includes("Loading data"));
    assert.ok(!loading.includes("Your next city starts here"));
    const failed = render({ error: new Error("Connection unavailable") });
    assert.match(failed, /role="alert">Connection unavailable/);
    assert.ok(failed.includes("Locations could not be loaded"));
    assert.ok(!failed.includes("Your next city starts here"));
  } finally {
    await server.close();
    if (previous === undefined) delete globalThis[key];
    else globalThis[key] = previous;
  }
});
