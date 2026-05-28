import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {AppBar} from "../../../core/ui/AppBar";
import {listEmployees} from "../../../data/store/storeApi";
import type {Employee} from "../../../domain/models/Store";
import {getActiveStoreId} from "../storeAdminContext";

const EMP_GRADIENTS = [
  "linear-gradient(135deg,#a78bfa,#7c3aed)",
  "linear-gradient(135deg,#6ee7f7,#3b82f6)",
  "linear-gradient(135deg,#f9a8d4,#ec4899)",
  "linear-gradient(135deg,#fcd34d,#f59e0b)",
  "linear-gradient(135deg,#6ee7b7,#10b981)",
];

export function ManageSchedulesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const storeId = getActiveStoreId();

  useEffect(() => {
    if (!storeId) return;
    listEmployees(storeId).then(setEmployees);
  }, [storeId]);

  if (!storeId) return null;

  return (
    <>
      <AppBar title="Manage Schedules" backTo="/store-admin" />
      <div className="page-bg">
        <main className="container" style={{paddingTop: "1.5rem", maxWidth: 600}}>
          <p className="nnc-label">Select an Employee</p>
          {employees.length === 0 ? (
            <p className="empty-text">
              Go to Manage Employees to add employees for your store.
            </p>
          ) : (
            employees.map((emp, idx) => (
              <Link
                key={emp.id}
                to={`/store-admin/schedules/employee/${emp.id}`}
                className="nnc-list-row"
              >
                <div
                  className="icon-circle"
                  style={{background: EMP_GRADIENTS[idx % EMP_GRADIENTS.length], color: "#fff", fontWeight: 700, fontSize: "1rem"}}
                >
                  {emp.firstName[0]}{emp.lastName[0]}
                </div>
                <div className="nnc-list-row__body">
                  <p className="nnc-list-row__title">{emp.firstName} {emp.lastName}</p>
                  <p className="nnc-list-row__sub">Set schedule →</p>
                </div>
                <span className="nnc-list-row__arrow">›</span>
              </Link>
            ))
          )}
        </main>
      </div>
    </>
  );
}
