module.exports =  ({ auth, func, db, valid}) => {
    const express = require('express')
    const { v4: uuidv4 } = require('uuid')
    const router = express.Router()
    const luxon = require('luxon')

    
    let DateTime = luxon.DateTime

    router.get('/', (req, res) => {
            db.query('SELECT * FROM events', (err, results) => {
                if (err) {
                    res.sendStatus(500)
                    console.error(err)
                } else {
                    results = results.map(event => ({
                        ...event,
                        start: DateTime.fromSeconds(event.start),
                        end: DateTime.fromSeconds(event.end)
                    }))

                    res.render('default', {
                        isAuthenticated: req.isAuthenticated(),
                        pagePath: 'module-events/home',
                        pageTitle: 'Community Events - MCMS',
                        events: results
                    })
                }
            })

        }
    )

    router.route('/create')
    .get(auth.hasPermissions(["MANAGE_EVENTS"], "AND"), (req, res) => {
        res.render('default', {
            isAuthenticated: req.isAuthenticated(),
            pagePath: 'module-events/create',
            pageTitle: 'Create Event - MCMS',
            errors: [],
            formData: {}
        })
    })
    .post(auth.hasPermissions(["MANAGE_EVENTS"], "AND"), (req, res) => {
        let {
            name,
            description,
            start,
            end,
            tags
        } = req.body

        let errors = []

        // Sanitise inputs
        name = valid.sanitiseInput(name || '')
        description = valid.sanitiseInput(description || '')
        tags = valid.sanitiseInput(tags || '')

        // Convert datetime-local inputs to Luxon
        let startDate = null
        let endDate = null

        // Validation
        if (!name) errors.push({ field: 'name', message: 'Event name is required' })
        
        if (!description) errors.push({ field: 'description', message: 'Description is required' })
        
        if (!start) {
            errors.push({ field: 'start', message: 'Start time is required' })
        } else {
            startDate = DateTime.fromISO(start)
        
            if (!startDate.isValid) {
                errors.push({ field: 'start', message: 'Invalid start time' })
            }
        }

        if (!end) {
            errors.push({ field: 'end', message: 'End time is required' })
        } else {
            endDate = DateTime.fromISO(end)
        
            if (!endDate.isValid) {
                errors.push({ field: 'end', message: 'Invalid end time' })
            }
        }

        // Logical validation
        if (startDate && endDate && endDate <= startDate) {
            errors.push({ field: 'end', message: 'End time must be after start time' })
        }

        if (errors.length > 0) {
        
            res.render('default', {
                isAuthenticated: req.isAuthenticated(),
                pagePath: 'events/create',
                pageTitle: 'Create Event - MCMS',
                errors: errors,
                formData: {
                    name,
                    description,
                    start,
                    end,
                    tags
                }
            })
        
        } else {
        
            // Convert to UNIX timestamps (consistent with your system)
            const startUnix = Math.trunc(startDate.toSeconds())
            const endUnix = Math.trunc(endDate.toSeconds())
        
            const newEvent = [
                uuidv4(),
                name,
                description,
                startUnix,
                endUnix,
                Math.trunc(DateTime.utc().toSeconds()),
                req.user, // assuming this is userID from passport
                tags || null
            ]
        
            db.query(
                'INSERT INTO events (eventID, name, description, start, end, created, createdBy, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                newEvent,
                (err, results) => {
                    if (err) {
                        console.error(err)
                        res.redirect('/events/create')
                    } else {
                        res.redirect('/events')
                    }
                }
            )
        }
    })

    return {
        router,
        viewsPath: __dirname + '/views'
    }
}