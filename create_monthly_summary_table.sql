-- =====================================================
-- MetLife Monthly Data Summary Table
-- Purpose: Pre-aggregated table for fast dashboard graph loading
-- =====================================================

-- Create the summary table
CREATE TABLE [dbo].[Tbl_MonthlyDataSummary] (
    [SummaryID] INT IDENTITY(1,1) PRIMARY KEY,
    [YearMonth] VARCHAR(7) NOT NULL,  -- Format: 'YYYY-MM'
    [InsuranceType] NVARCHAR(50) NOT NULL,
    [RecordCount] INT NOT NULL,
    [LastUpdated] DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_Month_InsuranceType UNIQUE ([YearMonth], [InsuranceType])
);

-- Create index for fast querying
CREATE INDEX IX_YearMonth ON [dbo].[Tbl_MonthlyDataSummary]([YearMonth]);
CREATE INDEX IX_InsuranceType ON [dbo].[Tbl_MonthlyDataSummary]([InsuranceType]);

-- Populate with existing data
INSERT INTO [dbo].[Tbl_MonthlyDataSummary] ([YearMonth], [InsuranceType], [RecordCount])
SELECT 
    FORMAT([Close Date], 'yyyy-MM') AS YearMonth,
    [Insurance Type] AS InsuranceType,
    COUNT(*) AS RecordCount
FROM [dbo].[Tbl_MetLifeDL_AllTasks_Monthly]
WHERE [Close Date] IS NOT NULL
GROUP BY FORMAT([Close Date], 'yyyy-MM'), [Insurance Type]
ORDER BY FORMAT([Close Date], 'yyyy-MM'), [Insurance Type];

-- View the results
SELECT * FROM [dbo].[Tbl_MonthlyDataSummary] ORDER BY [YearMonth], [InsuranceType];

-- =====================================================
-- Optional: Create a stored procedure to refresh the summary
-- =====================================================
CREATE PROCEDURE [dbo].[sp_RefreshMonthlyDataSummary]
AS
BEGIN
    -- Clear existing data
    TRUNCATE TABLE [dbo].[Tbl_MonthlyDataSummary];
    
    -- Repopulate with fresh data
    INSERT INTO [dbo].[Tbl_MonthlyDataSummary] ([YearMonth], [InsuranceType], [RecordCount])
    SELECT 
        FORMAT([Close Date], 'yyyy-MM') AS YearMonth,
        [Insurance Type] AS InsuranceType,
        COUNT(*) AS RecordCount
    FROM [dbo].[Tbl_MetLifeDL_AllTasks_Monthly]
    WHERE [Close Date] IS NOT NULL
    GROUP BY FORMAT([Close Date], 'yyyy-MM'), [Insurance Type];
    
    PRINT 'Monthly data summary refreshed successfully.';
END;
GO

-- To refresh the summary table, run:
-- EXEC [dbo].[sp_RefreshMonthlyDataSummary];
