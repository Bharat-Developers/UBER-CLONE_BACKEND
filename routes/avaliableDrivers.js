
import { Router } from 'express'
import authDriver from '../middlewares/driver_jwt.js'
import authRider from '../middlewares/rider_jwt.js'
import { getS2Id, getCell_Ids } from '../functions/S2CellIds.js'
import AvaliableDriver from '../models/AvaliableDrivers.js'
import Driver from '../models/Driver.js'
const router = Router()


router.put('/',authDriver,async(req,res,next) => {
    try{
        const action = req.body.action
        const cell_id = req.body.cell_id

        const existingCell = await AvailableDrivers.findOne({cell_id: cell_id})
        if(!existingCell){
            // If no existing entry, create a new one
            if(action === "push") {
            const newEntry = new AvaliableDriver({
                cell_id: cell_id,
                drivers: [req.driver.id],
            });
            await newEntry.save();
            return res.status(201).json({
                msg:'new cell created',
                success: true
            })
            }else{
                return res.status(404).json({
                    msg: 'cell not found',
                    success: false
                })
            }
        }    
        else{
            if(action === "push"){
                if (!existingCell.drivers.includes(req.driver.id)) {
                    existingCell.drivers.push(req.driver.id); // push driver id and save to db
                    await existingCell.save();
                  }
                return res.status(200).json({
                    success: true,
                    msg: "Driver added to existing cell"
                })
            } else if (action === "pull") {
                await AvaliableDriver.updateOne(
                  { cell_id },
                  { $pull: { drivers: req.driver.id } } // remove driver id from cell
                );
                return res.status(200).json({
                    msg: "Driver removed from existing cell",
                    success: true
                });
              } else {
                return res.status(404).json({
                    msg: 'invalid action',
                    success: false
                })
              }
            

        }
    }catch(error){
         //HTTP 500 Internal Server Error 
         console.log(error)
         return res.status(500).json({
             success: false,
             msg: 'Something went wrong'
         });
    }
})

router.get('/',authRider,async(req,res,next) => {
    try{
        const coordinate = req.body.coordinate;//{latitude,longitude}
        const S2cell = getS2Id(coordinate) // get current location cell id
        const cells = getCell_Ids(coordinate)// get cell ids of 30 cells around current cell
        const drivers_id = []
        // get all driver id in cells
        for(const cell of cells){
            const driver = await AvailableDrivers.findOne({cell_id: region}).select("-_id drivers")
            //if cell not exist , create new cell
            if(!driver){
                const newCell = new AvaliableDriver();
                newCell.cell_id = cell
                newCell.save()
            }
            else{ //add to driver array
                drivers_id.concat(driver)
            }
            
        }

        if(!drivers_id){ // if no drivers exist , return no driver found
            return res.status(404).json({
                found: false,
                msg:'no driver found'
            });
        }

        let drivers = []
        for(const driver_id of drivers_id){
            dri = await Driver.findOne({_id: driver_id , availablity: true}).select('-password -_id -aadhar -termsAccepted -email -createdAt -updatedAt')
            drivers.push(dri)
        }
        res.status(200).json({
            found: true,
            drivers: drivers,// return complete info of driver
            msg:'driver found'
        });

    }catch(error){
         //HTTP 500 Internal Server Error 
         console.log(error)
         return res.status(500).json({
             success: false,
             msg: 'Something went wrong'
         });
    }
})
export default router;



//endpoints
//put : '/' update drivers array in S2Cell , action {push ,pull}
//get : '/' get available drivers id in cell id (for rider)