const supplierService = require('../services/supplier.service');
const { handleError } = require('../utils/handleError.util');

const createSupplier = async (req, res) => {
    try {
        const {
            name,
            shortName,
            contactPersonName,
            phone,
            email,
            province,
            district,
            ward,
            addressLine,
            description,
            isActive,
        } = req.body;

        const result = await supplierService.createSupplierService({
            name,
            shortName,
            contactPersonName,
            phone,
            email,
            province,
            district,
            ward,
            addressLine,
            description,
            isActive,
        });

        return res.status(200).json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const getAllSuppliers = async (req, res) => {
    try {

        const result = await supplierService.getAllSuppliersService({ query: req.query });

        return res.status(200).json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const getSupplierById = async (req, res) => {
    try {
        const { supplierId } = req.params;

        const result = await supplierService.getSupplierByIdService({ supplierId });

        return res.status(200).json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const updateSupplierById = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const {
            name,
            shortName,
            contactPersonName,
            phone,
            email,
            province,
            district,
            ward,
            addressLine,
            description,
            isActive,
        } = req.body;

        const result = await supplierService.updateSupplierByIdService({
            supplierId,
            name,
            shortName,
            contactPersonName,
            phone,
            email,
            province,
            district,
            ward,
            addressLine,
            description,
            isActive,
        });

        return res.status(200).json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const updateSupplierVisibilityById = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const { isActive } = req.body;

        const result = await supplierService.updateSupplierVisibilityByIdService({ supplierId, isActive });

        return res.status(200).json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

const deleteSupplierById = async (req, res) => {
    try {
        const { supplierId } = req.params;

        const result = await supplierService.deleteSupplierByIdService({ supplierId });

        return res.status(200).json(result);
    } catch (error) {
        return handleError(res, error);
    }
};

module.exports = {
    createSupplier,
    getAllSuppliers,
    getSupplierById,
    updateSupplierById,
    updateSupplierVisibilityById,
    deleteSupplierById,
};