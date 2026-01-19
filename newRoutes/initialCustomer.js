import express from "express";
import db from "../models/winwayNew.js"; // path to your SQLite db.js

const router = express.Router();

/**
 * POST /api/initialCustomer
 * Saves initial customer data into:
 *   1️⃣ Current_Customer_Details
 *   2️⃣ Initial_Ticket_Breakdown_Details
 */
router.post("/", async (req, res) => {
  const { customers, Last_Update, current_count } = req.body;

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
          current_count + i
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

/**
 * GET /api/initialCustomer/combined
 * Returns joined data from:
 *   - Current_Customer_Details
 *   - Initial_Ticket_Breakdown_Details
 */

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

/* ---------------------------------------------
   GET /api/loyalty/current-tiers
   Get all Current_Loyalty_Tier values
---------------------------------------------- */

// 🟣 Fetch all Monthly_Upgrade_Details
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

// router.post("/monthly-update", async (req, res) => {
//   const updates = req.body.customers;
//   const Last_Update = req.body.Last_Update;
//   if (!Array.isArray(updates) || updates.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid input: expected a non-empty array of updates.",
//     });
//   }

//   try {
//     db.serialize(() => {
//       db.run("BEGIN TRANSACTION");

//       updates.forEach((entry) => {
//         const { MobileNumber, Loyalty_Tier, Ticket_Count } = entry;
//         const Current_Ticket_Count = Ticket_Count;
//         // 1️⃣ Update Current_Customer_Details

//          const preDat = `select Current_Loyalty_Tier,Current_Ticket_Count from Current_Customer_Details where MobileNumber = ?  DESC LIMIT 1`;
//         db.get(preDat, [MobileNumber], (err, row) => {
//           if (err) {
//             console.error(`❌ Error fetching previous data for ${MobileNumber}:`, err.message);
//             return;
//           }
//           const lastMonthTicketCount = row ? row.Current_Loyalty_Tier : null;
//           const lastMonthLoyaltyTier = row ? row.Current_Ticket_Count : null;

//         const new_Loyalty_Tier = Loyalty_Tier

//         const TierPriority = ['Platinum', 'Gold', 'Silver', 'Blue', 'Warning' , 'Rejected'];

//         let Evaluation_Status = "Same";

// if (lastMonthLoyaltyTier && new_Loyalty_Tier) {
//   const prevIndex = TierPriority.indexOf(lastMonthLoyaltyTier);
//   const newIndex  = TierPriority.indexOf(new_Loyalty_Tier);

//   if (prevIndex !== -1 && newIndex !== -1) {
//     if (newIndex < prevIndex) {
//       Evaluation_Status = "Upgraded";
//     } else if (newIndex > prevIndex) {
//       Evaluation_Status = "Down";
//     } else {
//       Evaluation_Status = "Same";
//     }
//   }
// }

//         const updateSql = `
//           UPDATE Current_Customer_Details
//           SET
//             Last_Update = ?,
//             Current_Loyalty_Tier = ?,
//             Current_Ticket_Count =               COALESCE(Current_Ticket_Count, 0) + COALESCE(?, 0)

//  Last_Month_Ticket_Count = ?,
//       Last_Month_Loyalty_Tier = ?,
//       Evaluation_Status = ?,

//           WHERE MobileNumber = ?
//         `;

//         db.run(
//           updateSql,
//           [Last_Update, new_Loyality_Tier, Current_Ticket_Count, lastMonthTicketCount,lastMonthLoyaltyTier, MobileNumber],
//           (err) => {
//             if (err) {
//               console.error(`❌ Error updating ${MobileNumber}:`, err.message);
//             } else {
//               console.log(
//                 `✅ Updated Current_Customer_Details for ${MobileNumber}`
//               );
//             }
//           }
//         );

//         // 2️⃣ Insert into Monthly_Upgrade_Details
//         const insertSql = `
//           INSERT INTO Monthly_Upgrade_Details (
//             MobileNumber,
//             Last_Update,
//             Month_Tier,

//             Monthly_Ticket_Count

//           ) VALUES (?, ?, ? , ?)
//         `;

//         db.run(
//           insertSql,
//           [MobileNumber, Last_Update, Loyalty_Tier, Current_Ticket_Count],
//           (err) => {
//             if (err) {
//               console.error(
//                 `❌ Error inserting Monthly_Upgrade_Details for ${MobileNumber}:`,
//                 err.message
//               );
//             } else {
//               console.log(
//                 `🆕 Added Monthly_Upgrade_Details for ${MobileNumber}`
//               );
//             }
//           }
//         );
//       });

//       db.run("COMMIT", (err) => {
//         if (err) {
//           console.error("❌ Commit failed:", err.message);
//           db.run("ROLLBACK");
//         }
//       });
//     });

//     res.status(200).json({
//       success: true,
//       message: `Processed ${updates.length} monthly updates successfully.`,
//     });

//   } catch (error) {
//     console.error("❌ Server error during monthly update:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while processing monthly updates",
//       error: error.message,
//     });
//   }
// });

router.post("/monthly-update", async (req, res) => {
  const updates = req.body.customers;
  const Last_Update = req.body.Last_Update;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid input: expected a non-empty array of updates.",
    });
  }

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
          ORDER BY Last_Update DESC
          LIMIT 1
        `;

        db.get(preSql, [MobileNumber], (err, row) => {
          if (err) {
            console.error(`❌ Fetch error ${MobileNumber}:`, err.message);
            return;
          }

          const lastMonthLoyaltyTier = row?.Current_Loyalty_Tier || null;
          const lastMonthTicketCount = row?.Current_Ticket_Count || 0;
          const new_Loyalty_Tier = Loyalty_Tier;

          const TierPriority = [
            "Platinum",
            "Gold",
            "Silver",
            "Blue",
            "Warning",
            "Rejected",
          ];

          let Evaluation_Status = "Same";

          if (lastMonthLoyaltyTier && new_Loyalty_Tier) {
            const prevIndex = TierPriority.indexOf(lastMonthLoyaltyTier);
            const newIndex = TierPriority.indexOf(new_Loyalty_Tier);

            if (prevIndex !== -1 && newIndex !== -1) {
              if (newIndex < prevIndex) Evaluation_Status = "Upgraded";
              else if (newIndex > prevIndex) Evaluation_Status = "Down";
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
              new_Loyalty_Tier,
              Ticket_Count,
              lastMonthTicketCount,
              lastMonthLoyaltyTier,
              Evaluation_Status,
              MobileNumber,
            ],
            (err) => {
              if (err) {
                console.error(`❌ Update failed ${MobileNumber}:`, err.message);
                return;
              }

              const insertSql = `
                INSERT INTO Monthly_Upgrade_Details (
                  MobileNumber,
                  Last_Update,
                  Month_Tier,
                  Monthly_Ticket_Count
                ) VALUES (?, ?, ?, ?)
              `;

              db.run(
                insertSql,
                [MobileNumber, Last_Update, new_Loyalty_Tier, Ticket_Count],
                (err) => {
                  if (err) {
                    console.error(
                      `❌ Insert failed ${MobileNumber}:`,
                      err.message
                    );
                    return;
                  }

                  pending--;
                  if (pending === 0) {
                    db.run("COMMIT");
                    res.status(200).json({
                      success: true,
                      message: `Processed ${updates.length} monthly updates successfully.`,
                    });
                  }
                }
              );
            }
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
      "Initial_Ticket_Breakdown_Details",
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
        `✅ Retrieved ${rows.length} Monthly_Upgrade_Details records`
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
