const Parcel = require("../models/Parcel");


// GET /api/parcels
exports.getParcels = async (req, res) => {
  try {
    const {
      state,
      zoning,
      status
    } = req.query;

    const filter = {};

    if (state) filter.state = state;
    if (zoning) filter.zoning = zoning;
    if (status) filter.status = status;

    const parcels = await Parcel.find(filter)
      .select("-owner")
      .lean();

    res.json({
      count: parcels.length,
      parcels
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch parcels"
    });
  }
};


// GET /api/parcels/:ulpin
exports.getParcelByUlpIN = async (req, res) => {
  try {
    const parcel = await Parcel.findOne({
      ulpin: req.params.ulpin
    }).populate("owner", "name phone");

    if (!parcel) {
      return res.status(404).json({
        message: "Parcel not found"
      });
    }

    res.json(parcel);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch parcel"
    });
  }
};