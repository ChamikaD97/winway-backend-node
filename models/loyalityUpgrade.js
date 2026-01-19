import db from "./db.js"; // Your SQLite database connection

// Function to create or update a customer

// ---------------------------
// Create or Update Customer Data (Current + Last Month)
// ---------------------------
export const createCustomer = (customer) => {
  const {
    FirstName,
    LastName,
    MobileNumber,
    Email,
    Gender,
    RegisteredDate,
    DateOfBirth,
    Status,
    Country,
    WalletBalance,
  } = customer;

  const { Ticket_Count, Loyalty_Tier, Last_Purchase_Time } = customer.updated;

  return new Promise((resolve, reject) => {
    const Ticket_Count_lastMonth = customer.lastMonth.Ticket_Count;

    const Loyalty_Tier_lastMonth = customer.lastMonth.Loyalty_Tier;
    const Last_Purchase_Time_lastMonth = customer.lastMonth.Last_Purchase_Time;

    // ---------- CURRENT MONTH ----------
    const checkSql = `SELECT MobileNumber FROM customers WHERE MobileNumber = ?`;

    db.get(checkSql, [MobileNumber], (err, row) => {
      if (err) return reject(err);

      if (row) {
        //  console.log(`🔁 Updating current customer ${MobileNumber}`);
        const updateSql = `
          UPDATE customers
          SET FirstName = ?, LastName = ?, Email = ?, Ticket_Count = ?, Loyalty_Tier = ?, 
              Last_Purchase_Time = ?, Gender = ?, RegisteredDate = ?, DateOfBirth = ?, 
              Status = ?, Country = ?, WalletBalance = ?
          WHERE MobileNumber = ?
        `;
        db.run(
          updateSql,
          [
            FirstName,
            LastName,
            Email,
            Ticket_Count,
            Loyalty_Tier,
            Last_Purchase_Time,
            Gender,
            RegisteredDate,
            DateOfBirth,
            Status,
            Country,
            WalletBalance,
            MobileNumber,
          ],
          function (err) {
            if (err) reject(err);
            else resolve(MobileNumber);
          }
        );
      } else {
        const insertSql = `
          INSERT INTO customers 
          (FirstName, LastName, MobileNumber, Email, Ticket_Count, Loyalty_Tier, 
           Last_Purchase_Time, Gender, RegisteredDate, DateOfBirth, Status, Country, WalletBalance)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(
          insertSql,
          [
            FirstName,
            LastName,
            MobileNumber,
            Email,
            Ticket_Count,
            Loyalty_Tier,
            Last_Purchase_Time,
            Gender,
            RegisteredDate,
            DateOfBirth,
            Status,
            Country,
            WalletBalance,
          ],
          function (err) {
            if (err) reject(err);
            else resolve(MobileNumber);
          }
        );
      }
    });
    // ---------- LAST MONTH ----------
    const checkSql2 = `SELECT MobileNumber FROM customers_last_month WHERE MobileNumber = ?`;

    db.get(checkSql2, [MobileNumber], (err, row) => {
      if (err) return reject(err);

      if (row) {
        const updateSql = `
          UPDATE customers_last_month
          SET FirstName = ?, LastName = ?, Email = ?, Ticket_Count = ?, Loyalty_Tier = ?, 
              Last_Purchase_Time = ?, Gender = ?, RegisteredDate = ?, DateOfBirth = ?, 
              Status = ?, Country = ?, WalletBalance = ?
          WHERE MobileNumber = ?
        `;
        db.run(
          updateSql,
          [
            FirstName,
            LastName,
            Email,
            Ticket_Count_lastMonth,
            Loyalty_Tier_lastMonth,
            Last_Purchase_Time_lastMonth,
            Gender,
            RegisteredDate,
            DateOfBirth,
            Status,
            Country,
            WalletBalance,
            MobileNumber,
          ],
          function (err) {
            if (err) reject(err);
            else resolve(MobileNumber);
          }
        );
      } else {
        const insertSql = `
          INSERT INTO customers_last_month 
          (FirstName, LastName, MobileNumber, Email, Ticket_Count, Loyalty_Tier, 
           Last_Purchase_Time, Gender, RegisteredDate, DateOfBirth, Status, Country, WalletBalance)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(
          insertSql,
          [
            FirstName,
            LastName,
            MobileNumber,
            Email,
            Ticket_Count_lastMonth,
            Loyalty_Tier_lastMonth,
            Last_Purchase_Time_lastMonth,
            Gender,
            RegisteredDate,
            DateOfBirth,
            Status,
            Country,
            WalletBalance,
          ],
          function (err) {
            if (err) reject(err);
            else resolve(MobileNumber);
          }
        );
      }
    });
  });
};

// ---------------------------
// Insert or Update Lottery Breakdown (Current + Last Month)
// ---------------------------
export const insertLotteryBreakdownUpgrade = (mobile, customer) => {
  const lastMonth = customer.lastMonth.LotteryBreakdown;
  const current = customer.updated.LotteryBreakdown;

  return new Promise((resolve, reject) => {
    // ---------- CURRENT ----------
    const checkCurrent = `SELECT COUNT(*) AS count FROM lottery_breakdown_overoll WHERE MobileNumber = ?`;
    const updateCurrent = `
      UPDATE lottery_breakdown_overoll
      SET Ada_Sampatha = ?, Dhana_Nidhanaya = ?, Govisetha = ?, Handahana = ?, Jaya = ?, 
          Mahajana_Sampatha = ?, Mega_Power = ?, Suba_Dawasak = ?, TotalTickets = ?
      WHERE MobileNumber = ?
    `;
    const insertCurrent = `
      INSERT INTO lottery_breakdown_overoll 
      (MobileNumber, Ada_Sampatha, Dhana_Nidhanaya, Govisetha, Handahana, Jaya, 
       Mahajana_Sampatha, Mega_Power, Suba_Dawasak, TotalTickets)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.get(checkCurrent, [mobile], (err, row) => {
      if (err) return reject(err);

      const args = [
        current.Ada_Sampatha,
        current.Dhana_Nidhanaya,
        current.Govisetha,
        current.Handahana,
        current.Jaya,
        current.Mahajana_Sampatha,
        current.Mega_Power,
        current.Suba_Dawasak,
        current.TotalTickets,
      ];

      if (row.count > 0) {
        db.run(updateCurrent, [...args, mobile], function (err) {
          if (err) reject(err);
        });
      } else {
        db.run(insertCurrent, [mobile, ...args], function (err) {
          if (err) reject(err);
        });
      }
    });

    // ---------- LAST MONTH ----------
    const checkLast = `SELECT COUNT(*) AS count FROM lottery_breakdowns_last_month WHERE MobileNumber = ?`;
    const updateLast = `
      UPDATE lottery_breakdowns_last_month
      SET Ada_Sampatha = ?, Dhana_Nidhanaya = ?, Govisetha = ?, Handahana = ?, Jaya = ?, 
          Mahajana_Sampatha = ?, Mega_Power = ?, Suba_Dawasak = ?, TotalTickets = ?
      WHERE MobileNumber = ?
    `;
    const insertLast = `
      INSERT INTO lottery_breakdowns_last_month 
      (MobileNumber, Ada_Sampatha, Dhana_Nidhanaya, Govisetha, Handahana, Jaya, 
       Mahajana_Sampatha, Mega_Power, Suba_Dawasak, TotalTickets)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.get(checkLast, [mobile], (err, row) => {
      if (err) return reject(err);

      const argsLast = [
        current.Ada_Sampatha,
        current.Dhana_Nidhanaya,
        current.Govisetha,
        current.Handahana,
        current.Jaya,
        current.Mahajana_Sampatha,
        current.Mega_Power,
        current.Suba_Dawasak,
        current.TotalTickets,
      ];
      if (row.count > 0) {
        db.run(updateLast, [...argsLast, mobile], function (err) {
          if (err) reject(err);
          else {
            resolve(`Updated breakdowns for ${mobile}`);
          }
        });
      } else {
        db.run(insertLast, [mobile, ...argsLast], function (err) {
          if (err) reject(err);
          else {
            resolve(`Inserted breakdowns for ${mobile}`);
          }
        });
      }
    });
  });
};

// GET /api/customers/combined
export const aaaa = () => {
  const sql = `
    SELECT 
      c.*, 
      clm.Ticket_Count AS Ticket_Count_lastMonth,
      clm.Loyalty_Tier AS Loyalty_Tier_lastMonth,
      clm.Last_Purchase_Time AS Last_Purchase_Time_lastMonth,
      lb.*, 
      lblm.*
    FROM customers c




    LEFT JOIN customers_last_month clm       ON c.MobileNumber = clm.MobileNumber
    LEFT JOIN lottery_breakdown_overoll lb       ON lb.MobileNumber = c.MobileNumber
    LEFT JOIN lottery_breakdowns_last_month lblm       ON lblm.MobileNumber = c.MobileNumber











  `;

  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);

      const formatted = rows.map((r) => {
        // transform breakdowns into nested objects
        const currentBreakdown = {
          Ada_Sampatha: r.Ada_Sampatha,
          Dhana_Nidhanaya: r.Dhana_Nidhanaya,
          Govisetha: r.Govisetha,
          Handahana: r.Handahana,
          Jaya: r.Jaya,
          Mahajana_Sampatha: r.Mahajana_Sampatha,
          Mega_Power: r.Mega_Power,
          Suba_Dawasak: r.Suba_Dawasak,
          TotalTickets: r.TotalTickets,
        };

        const lastMonthBreakdown = {
          Ada_Sampatha: r["lblm.Ada_Sampatha"] || 0,
          Dhana_Nidhanaya: r["lblm.Dhana_Nidhanaya"] || 0,
          Govisetha: r["lblm.Govisetha"] || 0,
          Handahana: r["lblm.Handahana"] || 0,
          Jaya: r["lblm.Jaya"] || 0,
          Mahajana_Sampatha: r["lblm.Mahajana_Sampatha"] || 0,
          Mega_Power: r["lblm.Mega_Power"] || 0,
          Suba_Dawasak: r["lblm.Suba_Dawasak"] || 0,
          TotalTickets: r["lblm.TotalTickets"] || 0,
        };

        // reconstruct object in same structure
        return {
          FirstName: r.FirstName,
          LastName: r.LastName,
          MobileNumber: r.MobileNumber,
          Email: r.Email,
          Gender: r.Gender,
          RegisteredDate: r.RegisteredDate,
          DateOfBirth: r.DateOfBirth,
          Status: r.Status,
          Country: r.Country,
          WalletBalance: r.WalletBalance,

          current: {
            Ticket_Count: r.Ticket_Count,
            Loyalty_Tier: r.Loyalty_Tier,
            Last_Purchase_Time: r.Last_Purchase_Time,
            LotteryBreakdown: currentBreakdown,
          },
          lastMonth: {
            Ticket_Count: r.Ticket_Count_lastMonth,
            Loyalty_Tier: r.Loyalty_Tier_lastMonth,
            Last_Purchase_Time: r.Last_Purchase_Time_lastMonth,
            LotteryBreakdown: lastMonthBreakdown,
          },
          updated: {
            Ticket_Count:
              (r.Ticket_Count_lastMonth || 0) + (r.Ticket_Count || 0),
            Loyalty_Tier: r.Loyalty_Tier,
            Last_Purchase_Time: r.Last_Purchase_Time,
            LotteryBreakdown: currentBreakdown, // you can merge here if needed
          },
        };
      });

      resolve(formatted);
    });
  });
};

export const getAllCustomersCombined = () => {
  const sql1 = `SELECT * FROM customers`;
  const sql2 = `SELECT * FROM lottery_breakdown_overoll`;
  const sql3 = `SELECT * FROM customers_last_month`;
  const sql4 = `SELECT * FROM lottery_breakdowns_last_month`;

  return new Promise((resolve, reject) => {
    console.log("🚀 Fetching and joining data from all 4 tables...");

    db.all(sql1, [], (err1, customers) => {
      if (err1) return reject(err1);
      console.log(`✅ Customers: ${customers.length}`);

      db.all(sql2, [], (err2, breakdowns) => {
        if (err2) return reject(err2);
        console.log(`✅ Current breakdowns: ${breakdowns.length}`);

        db.all(sql3, [], (err3, lastMonthCustomers) => {
          if (err3) return reject(err3);
          console.log(`✅ Last-month customers: ${lastMonthCustomers.length}`);

          db.all(sql4, [], (err4, lastMonthBreakdowns) => {
            if (err4) return reject(err4);
            console.log(
              `✅ Last-month breakdowns: ${lastMonthBreakdowns.length}`
            );

            // ✅ Join all tables by MobileNumber
            const combinedData = customers.map((cust) => {
              const mobile = cust.MobileNumber;

              const currentBreakdown =
                breakdowns.find((b) => b.MobileNumber === mobile) || {};
              const lastMonthCustomer =
                lastMonthCustomers.find((c) => c.MobileNumber === mobile) || {};
              const lastMonthBreakdown =
                lastMonthBreakdowns.find((b) => b.MobileNumber === mobile) ||
                {};

              return {
                ...cust,
                currentBreakdown,
                lastMonthCustomer,
                lastMonthBreakdown,
              };
            });

            // ✅ Add a summary for convenience
            const summary = {
              totalCustomers: customers.length,
              totalBreakdowns: breakdowns.length,
              totalLastMonthCustomers: lastMonthCustomers.length,
              totalLastMonthBreakdowns: lastMonthBreakdowns.length,
              mergedRecords: combinedData.length,
            };

            resolve({
              success: true,
              message: "✅ Joined customer data fetched successfully.",
              summary,
              data: combinedData,
            });
          });
        });
      });
    });
  });
};

// Get customer by MobileNumber
export const getCustomerByMobile = (mobile) => {
  const sql = `SELECT * FROM customers WHERE MobileNumber = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [mobile], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const getAllCustomersCsssssssombined = () => {
  const sql = `
    SELECT 
      -- customer (current snapshot)
      c.FirstName, c.LastName, c.MobileNumber, c.Email,
      c.Ticket_Count, c.Loyalty_Tier, c.Last_Purchase_Time,
      c.Gender, c.RegisteredDate, c.DateOfBirth, c.Status,
      c.Country, c.WalletBalance,

      -- customer (last month snapshot)
      clm.Ticket_Count  AS Ticket_Count_lastMonth,
      clm.Loyalty_Tier  AS Loyalty_Tier_lastMonth,
      clm.Last_Purchase_Time AS Last_Purchase_Time_lastMonth,

      -- breakdown (current)
      lb.Ada_Sampatha        AS curr_Ada_Sampatha,
      lb.Dhana_Nidhanaya     AS curr_Dhana_Nidhanaya,
      lb.Govisetha           AS curr_Govisetha,
      lb.Handahana           AS curr_Handahana,
      lb.Jaya                AS curr_Jaya,
      lb.Mahajana_Sampatha   AS curr_Mahajana_Sampatha,
      lb.Mega_Power          AS curr_Mega_Power,
      lb.Suba_Dawasak        AS curr_Suba_Dawasak,
      lb.TotalTickets        AS curr_TotalTickets,

      -- breakdown (last month)
      lblm.Ada_Sampatha        AS last_Ada_Sampatha,
      lblm.Dhana_Nidhanaya     AS last_Dhana_Nidhanaya,
      lblm.Govisetha           AS last_Govisetha,
      lblm.Handahana           AS last_Handahana,
      lblm.Jaya                AS last_Jaya,
      lblm.Mahajana_Sampatha   AS last_Mahajana_Sampatha,
      lblm.Mega_Power          AS last_Mega_Power,
      lblm.Suba_Dawasak        AS last_Suba_Dawasak,
      lblm.TotalTickets        AS last_TotalTickets

    FROM customers c
    LEFT JOIN customers_last_month clm 
      ON c.MobileNumber = clm.MobileNumber
    LEFT JOIN lottery_breakdown_overoll lb 
      ON lb.MobileNumber = c.MobileNumber
    LEFT JOIN lottery_breakdowns_last_month lblm 
      ON lblm.MobileNumber = c.MobileNumber
  `;

  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);

      const formatted = rows.map((r) => {
        const currentBreakdown = {
          Ada_Sampatha: r.curr_Ada_Sampatha || 0,
          Dhana_Nidhanaya: r.curr_Dhana_Nidhanaya || 0,
          Govisetha: r.curr_Govisetha || 0,
          Handahana: r.curr_Handahana || 0,
          Jaya: r.curr_Jaya || 0,
          Mahajana_Sampatha: r.curr_Mahajana_Sampatha || 0,
          Mega_Power: r.curr_Mega_Power || 0,
          Suba_Dawasak: r.curr_Suba_Dawasak || 0,
          TotalTickets: r.curr_TotalTickets || 0,
        };

        const lastMonthBreakdown = {
          Ada_Sampatha: r.last_Ada_Sampatha || 0,
          Dhana_Nidhanaya: r.last_Dhana_Nidhanaya || 0,
          Govisetha: r.last_Govisetha || 0,
          Handahana: r.last_Handahana || 0,
          Jaya: r.last_Jaya || 0,
          Mahajana_Sampatha: r.last_Mahajana_Sampatha || 0,
          Mega_Power: r.last_Mega_Power || 0,
          Suba_Dawasak: r.last_Suba_Dawasak || 0,
          TotalTickets: r.last_TotalTickets || 0,
        };

        return {
          FirstName: r.FirstName,
          LastName: r.LastName,
          MobileNumber: r.MobileNumber,
          Email: r.Email,
          Gender: r.Gender,
          RegisteredDate: r.RegisteredDate,
          DateOfBirth: r.DateOfBirth,
          Status: r.Status,
          Country: r.Country,
          WalletBalance: r.WalletBalance,

          current: {
            Ticket_Count: r.Ticket_Count || 0,
            Loyalty_Tier: r.Loyalty_Tier || null,
            Last_Purchase_Time: r.Last_Purchase_Time || null,
            LotteryBreakdown: currentBreakdown,
          },

          lastMonth: {
            Ticket_Count: r.Ticket_Count_lastMonth || 0,
            Loyalty_Tier: r.Loyalty_Tier_lastMonth || null,
            Last_Purchase_Time: r.Last_Purchase_Time_lastMonth || null,
            LotteryBreakdown: lastMonthBreakdown,
          },
        };
      });

      resolve(formatted);
    });
  });
};

export default db;
