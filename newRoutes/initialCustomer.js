import express from "express";
import db from "../models/winwayNew.js"; // path to your SQLite db.js

const router = express.Router();

router.post("/", async (req, res) => {
  const {
    customers,
    Last_Update,
    current_count,
    Last_Update_Summery,
    New_Customers,
  } = req.body;
  console.log(
    customers.length,
    Last_Update,
    Last_Update_Summery,
    New_Customers,
  );

  if (!Array.isArray(customers) || customers.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No customer data provided." });
  }

  const insertCustomerSQL = `
INSERT OR REPLACE INTO Current_Customer_Details (
  MobileNumber, Last_Update, FirstName, LastName, Email,
  Last_Purchase_Time, Gender, RegisteredDate, DateOfBirth,
  Status, Country, WalletBalance, Current_Ticket_Count,
  Current_Loyalty_Tier,  Loyalty_Number,

  Last_Month_Ticket_Count,
  Last_Month_Loyalty_Tier, 
  Evaluation_Status

  
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;

  const insertSqlMonthly = `
          INSERT INTO Monthly_Upgrade_Details (
            MobileNumber,
            Last_Update,
            Month_Tier,
           
            Monthly_Ticket_Count

          ) VALUES (?, ?, ? , ?)
        `;
  const updateSummarySql = `
  UPDATE Monthly_Upgrades_Summery
  SET New_Customers = ?
  WHERE Evaluation = ?
`;

  const insertSummarySql = `
  INSERT INTO Monthly_Upgrades_Summery (
    Evaluation,
    Upgrades,
    Downgrades,
    Same,
    New_Customers
  ) VALUES (?, ?, ?, ?, ?)
`;

  try {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      customers.forEach((cust, i) => {
        const {
          MobileNumber,
          FirstName,
          LastName,
          Email,
          Last_Purchase_Time,
          Gender,
          RegisteredDate,
          DateOfBirth,
          Status,
          Country,
          WalletBalance,
          Ticket_Count,
          Loyalty_Tier,
        } = cust;

        const Loyalty_Number = `0884  2025  0000  ${String(
          current_count + i,
        ).padStart(4, "0")}`;

        db.run(insertCustomerSQL, [
          MobileNumber,
          Last_Update,
          FirstName,
          LastName,
          Email,
          Last_Purchase_Time,
          Gender,
          RegisteredDate,
          DateOfBirth,
          Status,
          Country,
          WalletBalance || 0,
          Ticket_Count || 0,
          Loyalty_Tier || null,
          Loyalty_Number || null,
          Ticket_Count || 0,
          Loyalty_Tier || null,
          "Initial Load",
        ]);

        db.run(insertSqlMonthly, [
          MobileNumber,
          "Entry",
          Loyalty_Tier,
          Ticket_Count,
        ]);
      });

      if (New_Customers && Last_Update_Summery) {
        // ✅ UPDATE existing month summary
        db.run(
          updateSummarySql,
          [New_Customers, Last_Update_Summery],
          (err) => {
            if (err) {
              console.error("❌ Summary update failed:", err.message);
              db.run("ROLLBACK");
              return res.status(500).json({
                success: false,
                message: "Failed to update monthly summary",
              });
            }
          },
        );
      } else {
        // ✅ INSERT new month summary
        db.run(
          insertSummarySql,
          [
            "First Evaluation", // Evaluation (ex: 2025_December)
            0, // Upgrades
            0, // Downgrades
            0, // Same
            customers.length || 0, // New_Customers
          ],
          (err) => {
            if (err) {
              console.error("❌ Summary insert failed:", err.message);
              db.run("ROLLBACK");
              return res.status(500).json({
                success: false,
                message: "Failed to insert monthly summary",
              });
            }
          },
        );
      }

      db.run("COMMIT");
    });

    res.status(200).json({
      success: true,
      message: `Inserted ${customers.length} customers into both tables.`,
    });
  } catch (error) {
    console.error("❌ Error inserting initial customers:", error);
    db.run("ROLLBACK");
    res.status(500).json({
      success: false,
      message: "Server error while saving customers.",
      error: error.message,
    });
  }
});

router.get("/combined", async (req, res) => {
  try {
    const sql = `
      SELECT 
        c.MobileNumber,
        c.Last_Update,
        c.FirstName,
        c.LastName,
        c.Email,
        c.Last_Purchase_Time,
        c.Gender,
        c.RegisteredDate,
        c.DateOfBirth,
        c.Status,
        c.Country,
        c.WalletBalance,
        c.Current_Ticket_Count,
        c.Current_Loyalty_Tier     ,
        c.Loyalty_Number ,
        c.Last_Month_Ticket_Count,
        c.Last_Month_Loyalty_Tier,
       c.Evaluation_Status

      FROM Current_Customer_Details c
      
      
      ORDER BY c.Last_Update DESC, c.Current_Ticket_Count DESC
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching joined data:", err.message);
        return res.status(500).json({
          success: false,
          message: "Database error while fetching joined data.",
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No customer data found.",
        });
      }

      // ✅ Format each record for readability
      const formatted = rows.map((r) => ({
        MobileNumber: r.MobileNumber,
        Last_Update: r.Last_Update,

        CustomerInfo: {
          FirstName: r.FirstName,
          LastName: r.LastName,
          Email: r.Email,
          Last_Purchase_Time: r.Last_Purchase_Time,
          Gender: r.Gender,
          Loyalty_Number: r.Loyalty_Number,
          DateOfBirth: r.DateOfBirth,
          Status: r.Status,
          Country: r.Country,
          WalletBalance: r.WalletBalance,
          Current_Ticket_Count: r.Current_Ticket_Count,
          Current_Loyalty_Tier: r.Current_Loyalty_Tier,

          Last_Month_Ticket_Count: r.Last_Month_Ticket_Count,
          lastMonthLoyaltyTier: r.Last_Month_Loyalty_Tier,
          Evaluation_Status: r.Evaluation_Status,
        },
      }));
      let upgrades = 0;
      let downgrades = 0;
      let same = 0;
      let new_customers = 0;

      formatted.forEach((item) => {
        const status = item.CustomerInfo.Evaluation_Status;

        if (status === "Initial Load") {
          new_customers++;
        } else if (status === "Upgraded") {
          upgrades++;
        } else if (status === "Down") {
          downgrades++;
        } else if (status === "Same") {
          same++;
        }
      });

      res.json({
        success: true,
        total_records: formatted.length,
        new_customers,
        upgrades,
        same,
        downgrades,
        data: formatted,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({
      success: false,
      message: "Unexpected server error.",
    });
  }
});

router.get("/monthly-upgrades", async (req, res) => {
  try {
    const sql = `
      SELECT 
        MobileNumber,
        Last_Update,
        Month_Tier,
      
        Monthly_Ticket_Count
      FROM Monthly_Upgrade_Details
    `;

    // Query the database
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching Monthly_Upgrade_Details data:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch Monthly_Upgrade_Details data",
          error: err.message,
        });
      }

      res.status(200).json({
        success: true,
        message: "Monthly_Upgrade_Details fetched successfully",
        data: rows,
        count: rows.length,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.get("/monthly-upgrade-summery", async (req, res) => {
  try {
    const sql = `
      SELECT 
        *
      FROM Monthly_Upgrades_Summery
    `;

    // Query the database
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching Monthly_Upgrades_Summery data:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch Monthly_Upgrades_Summery data",
          error: err.message,
        });
      }

      res.status(200).json({
        success: true,
        message: "Monthly_Upgrades_Summery fetched successfully",
        data: rows,
        count: rows.length,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.post("/monthly-update", async (req, res) => {
  const updates = req.body.customers;
  const Last_Update = req.body.Last_Update;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid input: expected a non-empty array of updates.",
    });
  }

  // ✅ Monthly summary counters
  const summary = {
    Upgraded: 0,
    Downgrades: 0,
    Same: 0,
    New_Customers: 0,
  };

  try {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      let pending = updates.length;

      updates.forEach((entry) => {
        const { MobileNumber, Loyalty_Tier, Ticket_Count } = entry;

        const preSql = `
          SELECT Current_Loyalty_Tier, Current_Ticket_Count
          FROM Current_Customer_Details
          WHERE MobileNumber = ?
          LIMIT 1
        `;

        db.get(preSql, [MobileNumber], (err, row) => {
          if (err) {
            console.error(`❌ Fetch error ${MobileNumber}:`, err.message);
            return;
          }

          const lastTier = row?.Current_Loyalty_Tier || null;
          const lastTicketCount = row?.Current_Ticket_Count || 0;

          let newTier = Loyalty_Tier;

          // 🔴 Special downgrade rules
          if (lastTier === "Blue" && Loyalty_Tier === "Blue") {
            newTier = "Warning";
            console.log(
              lastTier              +" (" + lastTicketCount + " )" + "->",
              newTier + " (" + Ticket_Count + " )",
            );
          } else if (lastTier === "Warning" && Loyalty_Tier === "Blue") {
            newTier = "Rejected";
            console.log(
              lastTier
              +" (" + lastTicketCount + " )" + "->",
              newTier + " (" + Ticket_Count + " )",
            );
          } else {
            console.log(
              lastTier
              +" (" + lastTicketCount + " )" + "->",
              newTier + " (" + Ticket_Count + " )",
            );
          }

          const TierPriority = [
            "Platinum",
            "Gold",
            "Silver",
            "Blue",
            "Warning",
            "Rejected",
          ];

          let Evaluation_Status = "Same";

          if (!lastTier) {
            summary.New_Customers++;
          } else {
            const prevIndex = TierPriority.indexOf(lastTier);
            const newIndex = TierPriority.indexOf(newTier);

            if (prevIndex !== -1 && newIndex !== -1) {
              if (newIndex < prevIndex) {
                Evaluation_Status = "Upgraded";
                summary.Upgraded++;
              } else if (newIndex > prevIndex) {
                Evaluation_Status = "Down";
                summary.Downgrades++;
              } else {
                summary.Same++;
              }
            }
          }

          const updateSql = `
            UPDATE Current_Customer_Details
            SET 
              Last_Update = ?,
              Current_Loyalty_Tier = ?,
              Current_Ticket_Count = COALESCE(Current_Ticket_Count, 0) + ?,
              Last_Month_Ticket_Count = ?,
              Last_Month_Loyalty_Tier = ?,
              Evaluation_Status = ?
            WHERE MobileNumber = ?
          `;

          db.run(
            updateSql,
            [
              Last_Update,
              newTier,
              Ticket_Count,
              lastTicketCount,
              lastTier,
              Evaluation_Status,
              MobileNumber,
            ],
            (err) => {
              if (err) {
                console.error(`❌ Update failed ${MobileNumber}:`, err.message);
                return;
              }

              const insertMonthlySql = `
                INSERT INTO Monthly_Upgrade_Details (
                  MobileNumber,
                  Last_Update,
                  Month_Tier,
                  Monthly_Ticket_Count
                ) VALUES (?, ?, ?, ?)
              `;

              db.run(
                insertMonthlySql,
                [MobileNumber, Last_Update, newTier, Ticket_Count],
                (err) => {
                  if (err) {
                    console.error(
                      `❌ Monthly insert failed ${MobileNumber}:`,
                      err.message,
                    );
                    return;
                  }

                  pending--;

                  // ✅ When all customers processed
                  if (pending === 0) {
                    const summarySql = `

    INSERT OR REPLACE INTO Monthly_Upgrades_Summery (
      Evaluation,
      Upgrades,
      Downgrades,
      Same,
      New_Customers
    ) VALUES (?, ?, ?, ?, ?)
  `;

                    db.run(
                      summarySql,
                      [
                        Last_Update,
                        summary.Upgraded,
                        summary.Downgrades,
                        summary.Same,
                        0, // ✅ correct source
                      ],
                      (err) => {
                        if (err) {
                          console.error(
                            "❌ Summary insert failed:",
                            err.message,
                          );
                          db.run("ROLLBACK");
                          return res.status(500).json({
                            success: false,
                            message: "Failed to save monthly summary",
                          });
                        }

                        db.run("COMMIT");
                        res.status(200).json({
                          success: true,
                          message: `Processed ${updates.length} monthly updates successfully.`,
                          summary: {
                            ...summary,
                            New_Customers: 0,
                          },
                        });
                      },
                    );
                  }
                },
              );
            },
          );
        });
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while processing monthly updates",
    });
  }
});

router.delete("/delete-all", async (req, res) => {
  try {
    console.log("🗑 Deleting all table data...");

    // Tables to clear (only data)
    const tables = [
      "Current_Customer_Details",
      "Monthly_Upgrades_Summery",
      "Monthly_Upgrade_Details",
    ];

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      let completed = 0;
      let hasError = false;

      tables.forEach((table) => {
        db.run(`DELETE FROM ${table}`, (err) => {
          if (err) {
            console.error(`❌ Error deleting from ${table}:`, err.message);
            hasError = true;
            db.run("ROLLBACK");
            res.status(500).json({
              success: false,
              message: `Error deleting data from ${table}`,
              error: err.message,
            });
            return;
          } else {
            console.log(`🗑 Cleared data from table: ${table}`);
          }

          completed++;
          if (completed === tables.length && !hasError) {
            db.run("COMMIT", () => {
              console.log("✅ All data deleted successfully.");
              res.status(200).json({
                success: true,
                message:
                  "🧹 All table data deleted successfully (tables remain intact).",
              });
            });
          }
        });
      });
    });
  } catch (error) {
    console.error("❌ Deletion failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete data from all tables",
      error: error.message,
    });
  }
});
// 📊 Fetch all Monthly_Upgrade_Details
router.get("/monthly-upgrades", async (req, res) => {
  try {
    const sql = `
      SELECT 
        MobileNumber,
        Last_Update,
        Month_Tier,
        Ada_Sampatha,
        Dhana_Nidhanaya,
        Govisetha,
        Handahana,
        Jaya,
        Mahajana_Sampatha,
        Mega_Power,
        Suba_Dawasak,
        Monthly_Ticket_Count
      FROM Monthly_Upgrade_Details
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching Monthly_Upgrade_Details data:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch Monthly_Upgrade_Details data",
          error: err.message,
        });
      }

      console.log(
        `✅ Retrieved ${rows.length} Monthly_Upgrade_Details records`,
      );
      res.status(200).json({
        success: true,
        message: "Monthly_Upgrade_Details fetched successfully",
        data: rows,
        count: rows.length,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

export default router;
