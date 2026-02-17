import express from "express";
import db from "../models/winwayNew.js"; // path to your SQLite db.js
import upload from "../middlewares/uploadProfile.js";
import multer from "multer";
import promotionUpload from "../middlewares/promotionUpload.js";
import path from "path";
import fs from "fs";
import { log } from "console";
const router = express.Router();

router.post("/", async (req, res) => {
  const {
    customers,
    Last_Update,
    current_count,
    Last_Update_Summery,
    New_Customers,
  } = req.body;

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
const normalizePhone = (phone) => {
  if (!phone) return null;

  let p = phone.trim().replace(/\s+/g, "");

  // 07XXXXXXXX → +947XXXXXXXX
  if (/^0\d{9}$/.test(p)) {
    p = "94" + p.substring(1);
  }

  // 7XXXXXXXX → +947XXXXXXXX
  else if (/^7\d{8}$/.test(p)) {
    p = "94" + p;
  }

  // Already normalized
  if (!/^\94\d{9}$/.test(p)) return null;

  return p;
};

router.get("/combined/:mobile", async (req, res) => {
  try {
    const { mobile } = req.params;
    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required.",
      });
    }

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
        c.Current_Loyalty_Tier,
        c.Loyalty_Number,
        c.Last_Month_Ticket_Count,
        c.Last_Month_Loyalty_Tier,
        c.Evaluation_Status
      FROM Current_Customer_Details c
      WHERE c.MobileNumber = ?
      LIMIT 1
    `;

    db.get(sql, [normalizePhone(mobile)], (err, r) => {
      if (err) {
        console.error("❌ Error fetching customer by mobile:", err.message);
        return res.status(500).json({
          success: false,
          message: "Database error while fetching customer.",
        });
      }

      if (!r) {
        return res.status(404).json({
          success: false,
          message: "Customer not found for given mobile number.",
        });
      }

      // ✅ SAME FORMAT AS /combined
      const formatted = {
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
      };

      res.json({
        success: true,
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
          } else if (lastTier === "Warning" && Loyalty_Tier === "Blue") {
            newTier = "Rejected";
          } else {
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

export const saveCustomerProfileImage = (req, res) => {
  const { MobileNumber } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded" });
  }

  const imagePath = `/uploads/profiles/${req.file.filename}`;

  const sql = `
    INSERT INTO Customer_Profile_Image (MobileNumber, ImagePath)
    VALUES (?, ?)
    ON CONFLICT(MobileNumber)
    DO UPDATE SET
      ImagePath = excluded.ImagePath,
      UploadedAt = CURRENT_TIMESTAMP
  `;

  db.run(sql, [MobileNumber, imagePath], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }

    res.json({
      success: true,
      imagePath,
    });
  });
};
export const getCustomerProfileImage = (req, res) => {
  const { mobileNumber } = req.params;

  const sql = `
    SELECT ImagePath
    FROM Customer_Profile_Image
    WHERE MobileNumber = ?
  `;

  db.get(sql, [mobileNumber], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "DB error" });
    }
    if (!row) {
      return res.json({ imagePath: null });
    }
    res.json({
      imagePath: row.ImagePath,
    });
  });
};

export const getActivePromotions = (req, res) => {
  db.all(
    `
    SELECT *
    FROM loyality_promotions
    WHERE status = 'ACTIVE'
      AND date('now') BETWEEN date(start_date) AND date(end_date)
    ORDER BY start_date ASC
    `,
    [],

    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
};

export const getPromotionById = (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM loyality_promotions WHERE id = ?`, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ message: "Promotion not found" });
    res.json(row);
  });
};

export const getCustomerByMobile = (req, res) => {
  const { mobile } = req.params;

  db.get(
    `SELECT * FROM Current_Customer_Details WHERE MobileNumber = ?`,
    [normalizePhone(mobile)],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row)
        return res.status(404).json({ message: "Loyality User Not Found" });
      res.json(row);
    },
  );
};
export const getAllLoyalCustomers = (req, res) => {
  db.all(
    `SELECT * FROM Current_Customer_Details`,

    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows || rows.length === 0)
        return res.status(404).json({ message: "Loyality Users Not Found" });
      res.json(rows);
    },
  );
};

/* =====================================================
   2️⃣ UPDATE PROMOTION DATA (STEP 1)
   ❗ NO IMAGE HANDLING HERE
===================================================== */
export const updatePromotionDetails = (req, res) => {
  const {
    promotion_code,
    title,
    description,
    start_date,
    end_date,
    terms_conditions,
    status,
  } = req.body;

  if (!promotion_code) {
    return res.status(400).json({ error: "promotion_code is required" });
  }

  db.run(
    `
    UPDATE loyality_promotions
    SET title = ?, description = ?, start_date = ?, end_date = ?,
        terms_conditions = ?, status = ?
    WHERE promotion_code = ?
    `,
    [
      title,
      description,
      start_date,
      end_date,
      terms_conditions || "",
      status,
      promotion_code,
    ],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Promotion not found" });

      res.json({ message: "Promotion details updated" });
    },
  );
};

/* =====================================================
   3️⃣ UPDATE PROMOTION IMAGE (STEP 2)
===================================================== */
export const updatePromotionImage = (req, res) => {
  const { promotion_code } = req.body;

  if (!promotion_code) {
    return res.status(400).json({ error: "promotion_code is required" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "Image file is required" });
  }

  // Get existing image
  db.get(
    `SELECT image FROM loyality_promotions WHERE promotion_code = ?`,
    [promotion_code],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ message: "Promotion not found" });

      // Delete old image if exists
      if (row.image && fs.existsSync(row.image)) {
        fs.unlinkSync(path.resolve(row.image));
      }

      // Save new image path
      db.run(
        `
        UPDATE loyality_promotions
        SET image = ?
        WHERE promotion_code = ?
        `,
        [req.file.path, promotion_code],
        function (err) {
          if (err) return res.status(400).json({ error: err.message });

          res.json({ message: "Promotion image updated" });
        },
      );
    },
  );
};

/* =====================================================
   CREATE PROMOTION (IMAGE OPTIONAL)
===================================================== */
export const createPromotion = (req, res) => {
  const {
    promotion_code,
    title,
    description,
    start_date,
    end_date,
    terms_conditions,
    status,
    eligible_tiers, // ✅ NEW
    type,
  } = req.body;

  if (
    !promotion_code ||
    !title ||
    !start_date ||
    !end_date ||
    !eligible_tiers ||
    !type
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // ✅ Ensure array → JSON
  let tiersJson;
  try {
    const tiersArray =
      typeof eligible_tiers === "string"
        ? JSON.parse(eligible_tiers)
        : eligible_tiers;

    if (!Array.isArray(tiersArray) || tiersArray.length === 0) {
      return res
        .status(400)
        .json({ error: "eligible_tiers must be a non-empty array" });
    }

    tiersJson = JSON.stringify(tiersArray);
  } catch {
    return res.status(400).json({ error: "Invalid eligible_tiers format" });
  }

  const image = req.file ? req.file.path : null;

  db.run(
    `
    INSERT INTO loyality_promotions
    (promotion_code, title, description, start_date, end_date, image,
     terms_conditions, eligible_tiers, status , type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? , ?)
    `,
    [
      promotion_code,
      title,
      description || "",
      start_date,
      end_date,
      image,
      terms_conditions || "",
      tiersJson,
      status || "INACTIVE",
      type,
    ],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });

      res.json({
        message: "Promotion created successfully",
        id: this.lastID,
      });
    },
  );
};

/* =====================================================
   GET ALL PROMOTIONS
===================================================== */
export const getAllPromotions = (req, res) => {
  db.all(
    `SELECT * FROM loyality_promotions ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
};

/* =====================================================
   DEACTIVATE PROMOTION
===================================================== */
export const deactivatePromotion = (req, res) => {
  const { id } = req.params;

  db.run(
    `UPDATE loyality_promotions SET status = 'INACTIVE' WHERE id = ?`,
    [id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ message: "Promotion not found" });

      res.json({ message: "Promotion deactivated" });
    },
  );
};
export const deletePromotion = (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM loyality_promotions WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    res.json({ message: "Promotion permanently deleted" });
  });
};

/* =====================================================
   GET PROMOTION IMAGE (API BASED)
===================================================== */
export const getPromotionImage = (req, res) => {
  const { promotion_code } = req.params;

  db.get(
    `SELECT image FROM loyality_promotions WHERE promotion_code = ?`,
    [promotion_code],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row || !row.image)
        return res.status(404).json({ message: "Image not found" });

      const imgPath = path.resolve(row.image);
      if (!fs.existsSync(imgPath)) {
        return res.status(404).json({ message: "Image file missing" });
      }

      res.sendFile(imgPath);
    },
  );
};
/* =====================================================
   UPDATE PROMOTION (IMAGE AUTO HANDLED)
===================================================== */
export const updatePromotion = (req, res) => {
  const {
    promotion_code,
    title,
    description,
    start_date,
    end_date,
    terms_conditions,
    status,
    eligible_tiers, // ✅ NEW
  } = req.body;

  if (!promotion_code) {
    return res.status(400).json({ error: "promotion_code is required" });
  }

  // ✅ Parse tiers if provided
  let tiersJson = null;
  if (eligible_tiers) {
    try {
      const tiersArray =
        typeof eligible_tiers === "string"
          ? JSON.parse(eligible_tiers)
          : eligible_tiers;

      if (!Array.isArray(tiersArray) || tiersArray.length === 0) {
        return res
          .status(400)
          .json({ error: "eligible_tiers must be a non-empty array" });
      }

      tiersJson = JSON.stringify(tiersArray);
    } catch {
      return res.status(400).json({ error: "Invalid eligible_tiers format" });
    }
  }

  // 1️⃣ Get existing record
  db.get(
    `SELECT image FROM loyality_promotions WHERE promotion_code = ?`,
    [promotion_code],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ message: "Promotion not found" });

      // 2️⃣ Handle image replacement
      let imagePath = row.image;

      if (req.file) {
        if (row.image && fs.existsSync(row.image)) {
          fs.unlinkSync(path.resolve(row.image));
        }
        imagePath = req.file.path;
      }

      // 3️⃣ Update DB
      db.run(
        `
        UPDATE loyality_promotions
        SET title = ?,
            description = ?,
            start_date = ?,
            end_date = ?,
            image = ?,
            terms_conditions = ?,
            eligible_tiers = COALESCE(?, eligible_tiers),
            status = ?
        WHERE promotion_code = ?
        `,
        [
          title,
          description || "",
          start_date,
          end_date,
          imagePath,
          terms_conditions || "",
          tiersJson, // ✅ only updates if provided
          status,
          promotion_code,
        ],
        function (err) {
          if (err) return res.status(400).json({ error: err.message });

          res.json({ message: "Promotion updated successfully" });
        },
      );
    },
  );
};

router.post(
  "/profile-image",
  (req, res, next) => {
    upload.single("profileImage")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Image size exceeds the maximum allowed limit",
            maxFileSize: "2 MB",
          });
        }
      }

      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      next();
    });
  },
  saveCustomerProfileImage,
);
router.get("/profile-image/:mobileNumber", getCustomerProfileImage);

router.post(
  "/createPromotion",
  promotionUpload.single("image"),
  createPromotion,
);

router.put(
  "/updatePromotion",
  promotionUpload.single("image"), // 🔥 SAME HANDLER
  updatePromotion,
);

router.get("/getAllPromotions", getAllPromotions);

router.patch("/deactivatePromotion/:id/deactivate", deletePromotion);

router.get("/promotions/image/:promotion_code", getPromotionImage);

router.get("/getPromotionById/:id", getPromotionById);

router.get("/getCustomerByMobile/:mobile", getCustomerByMobile);

router.get("/getAllLoyalCustomers", getAllLoyalCustomers);

/* PUBLIC */
router.get("/public/active", getActivePromotions);

export default router;
